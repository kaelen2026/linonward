import { describe, expect, it } from "vitest";

import { healthReportSchema } from "./health.js";

describe("healthReportSchema", () => {
  it("accepts the API health contract", () => {
    expect(
      healthReportSchema.safeParse({
        status: "ok",
        version: "1.2.3",
        uptimeSeconds: 42,
        startedAt: "2026-08-28T00:00:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("rejects a superficially successful but malformed report", () => {
    expect(
      healthReportSchema.safeParse({
        status: "ok",
        version: 123,
        uptimeSeconds: -1,
        startedAt: "not-a-date",
      }).success,
    ).toBe(false);
  });
});
