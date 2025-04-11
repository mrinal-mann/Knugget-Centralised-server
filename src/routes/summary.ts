// src/routes/summary.ts
import { Router, Response, Request } from "express";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";
import prisma from "../config/prismaClient";
import { generateSummary } from "../services/generateSummary";

const router = Router();

// Generate summary route - protected by auth
router.post("/generate/", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { videoUrl, transcript, title } = req.body;
  if (!videoUrl || !transcript || !title) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    // Check if user has enough credits
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true }
    });

    if (!user || user.credits <= 0) {
      res.status(403).json({ error: "Insufficient credits" });
      return;
    }

    // Generate summary
    const summary = await generateSummary(transcript, title);
    
    // Deduct credit
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 1 } }
    });

    res.status(200).json(summary);
  } catch (error) {
    console.error("Summary generation error:", error);
    res.status(500).json({ error: "Summary generation failed" });
  }
});

// Save summary route - protected by auth
router.post("/save/", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { videoUrl, transcript, summary } = req.body;

  if (!videoUrl || !transcript || !summary) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const newSummary = await prisma.summary.create({
      data: {
        userId: req.user!.id,
        videoUrl,
        transcript,
        summary,
      },
    });

    res.json(newSummary);
  } catch (error) {
    res.status(500).json({ error: "Failed to create summary" });
  }
});

// Get user summaries route - protected by auth
router.get("/", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const summaries = await prisma.summary.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });

    res.json(summaries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch summaries" });
  }
});

// Get single summary route - protected by auth
router.get("/:id", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    const summary = await prisma.summary.findFirst({
      where: { 
        id,
        userId: req.user!.id
      },
    });
    
    if (!summary) {
      res.status(404).json({ error: "Summary not found" });
      return;
    }
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// Delete summary route - protected by auth
router.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    // Verify owner
    const summary = await prisma.summary.findFirst({
      where: { 
        id,
        userId: req.user!.id
      },
    });
    
    if (!summary) {
      res.status(404).json({ error: "Summary not found" });
      return;
    }
    
    // Delete summary
    await prisma.summary.delete({
      where: { id }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete summary" });
  }
});

export default router;