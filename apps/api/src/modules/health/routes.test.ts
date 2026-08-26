import { describe, expect, it } from "vitest";

import { createApp } from "../../app.js";
import { createHealthModule } from "./index.js";
import type { DependencyProbes } from "./service.js";

const startedAt = new Date("2026-08-26T07:00:00.000Z");

function appProbing(probes: DependencyProbes) {
  return createApp({
    allowedOrigins: [],
    modules: [createHealthModule({ version: "1.4.0", startedAt, clock: () => startedAt, probes })],
  });
}

describe("health routes", () => {
  it("answers liveness without consulting a dependency", async () => {
    // A probe that hangs must not be able to get the container killed.
    const response = await appProbing({ postgres: () => new Promise(() => {}) }).request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", version: "1.4.0" });
  });

  it("reports readiness as 200 when the dependencies answer", async () => {
    const response = await appProbing({ postgres: () => Promise.resolve() }).request(
      "/health/ready",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ checks: { postgres: "ok" } });
  });

  it("answers 503 while a dependency is down, so a proxy stops sending traffic", async () => {
    const response = await appProbing({
      postgres: () => Promise.reject(new Error("ECONNREFUSED")),
    }).request("/health/ready");

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      status: "degraded",
      checks: { postgres: "failed" },
    });
  });
});
