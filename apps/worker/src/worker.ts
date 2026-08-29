import type { Database } from "@linonward/db";
import { Worker } from "bullmq";
import type { WorkerConfig } from "./config.js";
import {
  type AsyncJobData,
  type AsyncJobName,
  type AsyncJobResult,
  createJobProcessor,
  queueName,
} from "./jobs.js";

export function createAsyncWorker(config: WorkerConfig, database: Database) {
  return new Worker<AsyncJobData, AsyncJobResult, AsyncJobName>(
    queueName,
    createJobProcessor({ database }),
    {
      concurrency: config.concurrency,
      connection: config.connection,
      prefix: config.prefix,
    },
  );
}
