import { Queue } from "bullmq";
import type { WorkerConfig } from "./config.js";
import { type AsyncJobData, type AsyncJobName, type AsyncJobResult, queueName } from "./jobs.js";

export function createAsyncQueue(config: Pick<WorkerConfig, "connection" | "prefix">) {
  return new Queue<AsyncJobData, AsyncJobResult, AsyncJobName>(queueName, {
    connection: config.connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { delay: 1_000, type: "exponential" },
      removeOnComplete: { age: 86_400, count: 1_000 },
      removeOnFail: { age: 604_800, count: 5_000 },
    },
    prefix: config.prefix,
  });
}
