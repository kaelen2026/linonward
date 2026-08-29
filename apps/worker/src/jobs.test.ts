import type { Database } from "@linonward/db";
import type { Job } from "bullmq";
import { describe, expect, it } from "vitest";
import type { AsyncJobData, AsyncJobName, AsyncJobResult } from "./jobs.js";
import { createJobProcessor } from "./jobs.js";

describe("processJob", () => {
  it("processes an echo job", async () => {
    const job = {
      data: { message: "hello" },
      name: "system.echo",
    } as Job<AsyncJobData, AsyncJobResult, AsyncJobName>;

    const processJob = createJobProcessor({ database: {} as Database });
    await expect(processJob(job)).resolves.toMatchObject({ message: "hello" });
  });
});
