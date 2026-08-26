import { describe, expect, it } from "vitest";

import { createHealthService } from "./service.js";

const startedAt = new Date("2026-08-26T07:00:00.000Z");

describe("createHealthService", () => {
  it("reports the running version so a deploy can be identified", () => {
    const service = createHealthService({ version: "1.4.0", startedAt, clock: () => startedAt });

    expect(service.check()).toMatchObject({ status: "ok", version: "1.4.0" });
  });

  it("counts whole seconds since the process started", () => {
    const service = createHealthService({
      version: "1.4.0",
      startedAt,
      clock: () => new Date("2026-08-26T07:00:41.900Z"),
    });

    expect(service.check().uptimeSeconds).toBe(41);
  });
});

describe("readiness", () => {
  const base = { version: "1.4.0", startedAt, clock: () => startedAt };

  it("is ready when every dependency answers", async () => {
    const service = createHealthService({
      ...base,
      probes: { postgres: () => Promise.resolve(), redis: () => Promise.resolve() },
    });

    await expect(service.readiness()).resolves.toEqual({
      status: "ready",
      checks: { postgres: "ok", redis: "ok" },
    });
  });

  it("names the dependency that failed instead of reporting a bare outage", async () => {
    const service = createHealthService({
      ...base,
      probes: {
        postgres: () => Promise.resolve(),
        redis: () => Promise.reject(new Error("ECONNREFUSED")),
      },
    });

    await expect(service.readiness()).resolves.toEqual({
      status: "degraded",
      checks: { postgres: "ok", redis: "failed" },
    });
  });

  it("is ready with nothing to probe, so an in-memory deploy still starts", async () => {
    await expect(createHealthService(base).readiness()).resolves.toMatchObject({
      status: "ready",
    });
  });
});
