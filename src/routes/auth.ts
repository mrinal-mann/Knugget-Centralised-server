import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";
import prisma from "../config/prismaClient";

const router = Router();

router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.id;

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

  res.json({ user: userData });
});

export default router;
