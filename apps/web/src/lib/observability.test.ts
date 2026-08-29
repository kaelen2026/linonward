import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchObservabilitySnapshot } from "@/lib/observability";

afterEach(() => vi.restoreAllMocks());

function prometheusResult(result: unknown): Response {
  return Response.json({ status: "success", data: { result } });
}

describe("fetchObservabilitySnapshot", () => {
  it("returns real Prometheus values without inventing unavailable data", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.port === "3200") return Response.json({ traces: [] });
      const query = url.searchParams.get("query") ?? "";
      if (url.pathname.endsWith("query_range"))
        return Response.json({
          status: "success",
          data: {
            result: [
              {
                values: [
                  [1, "1"],
                  [2, "2"],
                ],
              },
            ],
          },
        });
      if (query.includes("100 *")) return prometheusResult([{ metric: {}, value: [1, "0.25"] }]);
      if (query.includes("histogram_quantile"))
        return prometheusResult([{ metric: {}, value: [1, "120"] }]);
      if (query.includes("requests_active"))
        return prometheusResult([{ metric: {}, value: [1, "2"] }]);
      if (query.includes("sum by"))
        return prometheusResult([
          { metric: { method: "GET", route: "/health", status: "200" }, value: [1, "3"] },
        ]);
      return prometheusResult([{ metric: {}, value: [1, "4.5"] }]);
    });

    await expect(fetchObservabilitySnapshot()).resolves.toMatchObject({
      reachable: true,
      requestsPerSecond: 4.5,
      errorRatePercent: 0.25,
      p95LatencyMs: 120,
      activeRequests: 2,
      routes: [{ method: "GET", route: "/health", status: "200", requestsPerSecond: 3 }],
      requestRateSeries: [1, 2],
      latencySeries: [1, 2],
    });
  });

  it("returns an explicit offline state when Prometheus cannot be reached", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("connection refused"));

    await expect(fetchObservabilitySnapshot()).resolves.toMatchObject({
      reachable: false,
      routes: [],
      traces: [],
      reason: "connection refused",
    });
  });
});
