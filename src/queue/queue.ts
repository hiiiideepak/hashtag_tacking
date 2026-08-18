import { QueueJob } from "../types";

type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

class Queue {
  private jobs: QueueJob[] = [];
  private handlers: Map<string, JobHandler> = new Map();
  private processing = false;

  registerHandler(jobType: string, handler: JobHandler): void {
    this.handlers.set(jobType, handler);
  }

  async enqueue(
    type: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const job: QueueJob = {
      type,
      payload,
      createdAt: Date.now(),
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    this.jobs.push(job);
    console.log(`[Queue] Job enqueued: ${job.id} (${type})`);

    if (!this.processing) {
      this.process();
    }
  }

  private async process(): Promise<void> {
    if (this.processing || this.jobs.length === 0) {
      return;
    }

    this.processing = true;

    while (this.jobs.length > 0) {
      const job = this.jobs.shift();

      if (!job) break;

      const handler = this.handlers.get(job.type);

      if (!handler) {
        console.warn(
          `[Queue] No handler found for job type: ${job.type}. Job skipped.`
        );
        continue;
      }

      try {
        console.log(`[Queue] Processing job: ${job.id} (${job.type})`);
        await handler(job.payload);
        console.log(`[Queue] Job completed: ${job.id}`);
      } catch (error) {
        console.error(
          `[Queue] Job failed: ${job.id}`,
          error instanceof Error ? error.message : error
        );
      }
    }

    this.processing = false;
  }

  getQueueLength(): number {
    return this.jobs.length;
  }
}

export const queue = new Queue();
