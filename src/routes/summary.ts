// src/routes/summary.ts
import { Router, Response, Request } from "express";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";
import prisma from "../config/prismaClient";
import { generateSummary } from "../services/generateSummary";

const router = Router();

// Generate or retrieve summary
router.post("/generate", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { videoUrl, metadata } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: "Video URL is required" });
    }

    // Check for existing summary
    let existingSummary;
    try {
      existingSummary = await prisma.summary.findFirst({
        where: {
          videoUrl,
        },
      });

      if (existingSummary) {
        return res.json({
          summary: existingSummary.summary,
          transcript: existingSummary.transcript,
        });
      }
    } catch (dbError) {
      console.error("Database error checking for existing summary:", dbError);
      // Continue with summary generation even if DB lookup fails
    }

    // Check user credits
    let userCredits = 0;
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      userCredits = user.credits;

      if (userCredits < 1) {
        return res.status(403).json({ error: "Insufficient credits" });
      }
    } catch (dbError) {
      console.error("Database error checking user credits:", dbError);
      // For now, we'll allow the operation to continue even if credit check fails
      // In a production system, you might want to handle this differently
    }

    // Generate summary
    const { title, keyPoints, fullSummary } = await generateSummary(
      videoUrl,
      metadata
    );

    if (!fullSummary) {
      return res.status(500).json({ error: "Failed to generate summary" });
    }

    // Format summary for storage
    const summaryText = `${title}\n\nKey Points:\n${keyPoints
      .map((point) => `- ${point}`)
      .join("\n")}\n\n${fullSummary}`;
    const transcript = videoUrl; // Using videoUrl as transcript since we don't have actual transcript

    // Save summary to database and update user credits
    try {
      await prisma.$transaction([
        prisma.summary.create({
          data: {
            userId,
            videoUrl,
            summary: summaryText,
            transcript,
          },
        }),
        prisma.user.update({
          where: { id: userId },
          data: {
            credits: { decrement: 1 },
          },
        }),
      ]);
    } catch (dbError) {
      console.error("Database error saving summary:", dbError);
      // Continue and return the summary even if saving fails
    }

    return res.json({
      summary: summaryText,
      transcript,
      creditsRemaining: Math.max(0, userCredits - 1),
    });
  } catch (error) {
    console.error("Error generating summary:", error);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

// Get all summaries for a user
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const summaries = await prisma.summary.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ summaries });
  } catch (error) {
    console.error("Error fetching summaries:", error);
    res.status(500).json({ error: "Failed to fetch summaries", summaries: [] });
  }
});

// Save summary route - protected by auth
router.post(
  "/save/",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
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
  }
);

// Get single summary route - protected by auth
router.get(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const summary = await prisma.summary.findFirst({
        where: {
          id,
          userId: req.user!.id,
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
  }
);

// Delete summary route - protected by auth
router.delete(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      // Verify owner
      const summary = await prisma.summary.findFirst({
        where: {
          id,
          userId: req.user!.id,
        },
      });

      if (!summary) {
        res.status(404).json({ error: "Summary not found" });
        return;
      }

      // Delete summary
      await prisma.summary.delete({
        where: { id },
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete summary" });
    }
  }
);

export default router;
