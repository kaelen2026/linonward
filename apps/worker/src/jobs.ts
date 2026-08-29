import type { Database } from "@linonward/db";
import type { Job } from "bullmq";

export const queueName = "async-tasks";

export type AsyncJobName = "system.echo";

export type AsyncJobData = {
  message: string;
};

export type AsyncJobResult = {
  echoedAt: string;
  message: string;
};

export type JobDependencies = {
  database: Database;
};

export function createJobProcessor(dependencies: JobDependencies) {
  return async function processJob(
    job: Job<AsyncJobData, AsyncJobResult, AsyncJobName>,
  ): Promise<AsyncJobResult> {
    switch (job.name) {
      case "system.echo":
        // Every production handler receives the same shared database handle.
        // The smoke-test handler deliberately performs no database writes.
        void dependencies.database;
        return { echoedAt: new Date().toISOString(), message: job.data.message };
      default:
        throw new Error(`Unsupported job: ${job.name satisfies never}`);
    }
  };
}
