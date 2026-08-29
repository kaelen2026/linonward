import { loadWorkerConfig } from "./config.js";
import { createAsyncQueue } from "./queue.js";

const config = loadWorkerConfig(process.env);
const queue = createAsyncQueue(config);

try {
  const job = await queue.add("system.echo", {
    message: process.argv.slice(2).join(" ") || "Hello from LinOnward",
  });
  console.info("Async job queued", { id: job.id, name: job.name });
} finally {
  await queue.close();
}
