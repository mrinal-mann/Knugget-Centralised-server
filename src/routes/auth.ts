import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";
import prisma from "../config/prismaClient";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = Router();

// Get user profile
router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.id;

  try {
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        credits: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: userData });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Login user
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    if (!user.passwordHash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Create token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "24h",
    });

    // Return user info without password
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        imageUrl: user.imageUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Register user
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user without verification token
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        credits: 5, // Give new users 5 free credits
      },
    });

    // Create token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "24h",
    });

    // Return user info with token
    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        imageUrl: user.imageUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;