import { describe, expect, it } from "vitest";

import { startServerTrace } from "./telemetry.js";

describe("startServerTrace", () => {
  it("continues the incoming trace with a fresh server span", () => {
    const serverTrace = startServerTrace(
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      "HTTP GET",
    );

    expect(serverTrace.correlation.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
    expect(serverTrace.correlation.spanId).toMatch(/^[0-9a-f]{16}$/);
    expect(serverTrace.correlation.spanId).not.toBe("00f067aa0ba902b7");
    serverTrace.span.end();
  });

  it("starts a sampled trace when the incoming header is invalid", () => {
    const serverTrace = startServerTrace("not-a-trace", "HTTP GET");

    expect(serverTrace.correlation.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(serverTrace.correlation.traceId).not.toMatch(/^0+$/);
    expect(serverTrace.correlation.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    serverTrace.span.end();
  });
});
