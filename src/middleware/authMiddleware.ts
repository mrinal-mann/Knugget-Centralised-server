// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import prisma from "../config/prismaClient";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    image: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    
    // Check if user exists in local database
    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    
    // Create or update user in local DB
    if (!dbUser) {
      // Create new user
      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email!,
          name: user.user_metadata.full_name || undefined,
          imageUrl: user.user_metadata.avatar_url || undefined,
          provider: user.user_metadata.provider || "oauth",
          credits: 10, // Initial free credits
        },
      });
    } else {
      // Update existing user
      dbUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: user.email!,
          name: user.user_metadata.full_name || dbUser.name,
          imageUrl: user.user_metadata.avatar_url || dbUser.imageUrl,
          provider: user.user_metadata.provider || dbUser.provider || "oauth",
        },
      });
    }

    req.user = {
      id: user.id,
      email: user.email!,
      name: user.user_metadata.full_name || dbUser.name || "",
      image: user.user_metadata.avatar_url || dbUser.imageUrl || "",
    };

    return next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    res.status(500).json({ error: "Authentication middleware failed" });
  }
};