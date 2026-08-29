import { connectDatabase } from "@linonward/db";
import { loadWorkerConfig } from "./config.js";
import { createAsyncWorker } from "./worker.js";

const config = loadWorkerConfig(process.env);
const postgres = connectDatabase(config.databaseUrl);
const worker = await (async () => {
  try {
    await postgres.ping();
    return createAsyncWorker(config, postgres.db);
  } catch (error) {
    await postgres.close();
    throw error;
  }
})();
let closing = false;

worker.on("completed", (job) => {
  console.info("Async job completed", { id: job.id, name: job.name });
});
worker.on("failed", (job, error) => {
  console.error("Async job failed", { error, id: job?.id, name: job?.name });
});
worker.on("error", (error) => {
  console.error("Async worker error", error);
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (closing) return;
  closing = true;
  console.info(`Received ${signal}; waiting for active jobs to finish`);
  const results = await Promise.allSettled([worker.close(), postgres.close()]);
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (failure) throw failure.reason;
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown(signal).catch((error: unknown) => {
      console.error("Unable to close async worker cleanly", error);
      process.exitCode = 1;
    });
  });
}

console.info("Async worker started", {
  concurrency: config.concurrency,
  prefix: config.prefix,
  queue: worker.name,
});
