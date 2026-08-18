import cron from "node-cron";
import { queue } from "../queue/queue";

export function scheduleCronJobs(): void {
  console.log("[Cron] Scheduling cron jobs...");

  cron.schedule("0 */3 * * *", async () => {
    console.log("[Cron] Triggering recent media sync (every 3 hours)");
    await queue.enqueue("SYNC_RECENT_HASHTAG_MEDIA", {
      hashtag: "matcha",
    });
  });

  console.log("[Cron] Cron jobs scheduled successfully");
}
