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
