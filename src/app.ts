import "dotenv/config";
import express from "express";
import { runMigrations } from "./db/migrations";
import { queue } from "./queue/queue";
import { syncService } from "./services/syncService";
import { scheduleCronJobs } from "./cron/jobs";
import routes from "./api/routes";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use(routes);

queue.registerHandler("SYNC_TOP_HASHTAG_MEDIA", async (payload) => {
  const hashtag = payload.hashtag as string;
  await syncService.syncTopMedia(hashtag);
});

queue.registerHandler("SYNC_RECENT_HASHTAG_MEDIA", async (payload) => {
  const hashtag = payload.hashtag as string;
  await syncService.syncRecentMedia(hashtag);
});

async function bootstrap() {
  try {
    console.log("[App] Running database migrations...");
    await runMigrations();
    console.log("[App] Migrations completed");

    console.log("[App] Scheduling cron jobs...");
    scheduleCronJobs();

    console.log("[App] Syncing initial top media for matcha hashtag...");
    await queue.enqueue("SYNC_TOP_HASHTAG_MEDIA", {
      hashtag: "matcha",
    });

    app.listen(port, () => {
      console.log(
        `[App] Server running on port ${port} - Node environment: ${process.env.NODE_ENV}`
      );
    });
  } catch (error) {
    console.error("[App] Bootstrap failed:", error);
    process.exit(1);
  }
}

bootstrap();
