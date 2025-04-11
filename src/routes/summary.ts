import { Router, Response, Request } from "express";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";
import prisma from "../config/prismaClient";
import { generateSummary } from "../services/generateSummary";

const router = Router();

router.use(authMiddleware); // protect all routes

router.post("/generate/", async (req: AuthRequest, res: Response): Promise<void> => {
  const { videoUrl, transcript, title } = req.body;
  if (!videoUrl || !transcript || !title) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const summary = await generateSummary(transcript, title);
    res.status(200).json({ summary });
  } catch (error) {
    console.error("Summary generation error:", error);
    res.status(500).json({ error: "Summary generation failed" });
  }
});

// Save new summary
router.post("/save/", async (req: AuthRequest, res: Response): Promise<void> => {
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

// Get user summaries
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
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

export default router;
