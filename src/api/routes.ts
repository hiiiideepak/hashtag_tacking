import { Router, Request, Response } from "express";
import { mediaService } from "../services/mediaService";
import { queue } from "../queue/queue";
import { syncService } from "../services/syncService";

const router = Router();

router.get("/hashtags", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const result = await mediaService.getAllMedia({ page, limit });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("[API] Error fetching hashtag media:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch hashtag media",
    });
  }
});

router.get("/hashtags/:name", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const { name } = req.params;

    const result = await mediaService.getAllMedia({ page, limit });

    res.json({
      success: true,
      data: result.data.filter((m) => m.hashtag_id === name),
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("[API] Error fetching hashtag media:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch hashtag media",
    });
  }
});

router.post("/sync/top", async (req: Request, res: Response) => {
  try {
    const hashtag = req.body.hashtag || "matcha";

    await queue.enqueue("SYNC_TOP_HASHTAG_MEDIA", {
      hashtag,
    });

    res.json({
      success: true,
      message: `Enqueued top media sync for hashtag: ${hashtag}`,
      queueLength: queue.getQueueLength(),
    });
  } catch (error) {
    console.error("[API] Error enqueueing sync:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to enqueue sync",
    });
  }
});

router.post("/sync/recent", async (req: Request, res: Response) => {
  try {
    const hashtag = req.body.hashtag || "matcha";

    await queue.enqueue("SYNC_RECENT_HASHTAG_MEDIA", {
      hashtag,
    });

    res.json({
      success: true,
      message: `Enqueued recent media sync for hashtag: ${hashtag}`,
      queueLength: queue.getQueueLength(),
    });
  } catch (error) {
    console.error("[API] Error enqueueing sync:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to enqueue sync",
    });
  }
});

router.get("/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    status: "healthy",
    queueLength: queue.getQueueLength(),
  });
});

export default router;
