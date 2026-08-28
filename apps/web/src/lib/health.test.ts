import { describe, expect, it, vi } from "vitest";

import { fetchApiHealth } from "@/lib/health";

function respondWith(body: unknown, init?: ResponseInit) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
      ...init,
    }),
  );
}

describe("fetchApiHealth", () => {
  it("reports the version the API answers with", async () => {
    respondWith({
      status: "ok",
      version: "1.2.3",
      uptimeSeconds: 42,
      startedAt: "2026-08-28T00:00:00.000Z",
    });

    await expect(fetchApiHealth()).resolves.toEqual({
      reachable: true,
      status: "ok",
      version: "1.2.3",
      uptimeSeconds: 42,
    });
  });

  it("asks for a fresh answer rather than a cached one", async () => {
    const fetchSpy = respondWith({
      status: "ok",
      version: "1.2.3",
      uptimeSeconds: 0,
      startedAt: "2026-08-28T00:00:00.000Z",
    });

    await fetchApiHealth();

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/health"),
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("treats an error status as unreachable instead of throwing", async () => {
    respondWith({}, { status: 503 });

    await expect(fetchApiHealth()).resolves.toEqual({ reachable: false, reason: "HTTP 503" });
  });

  it("rejects a successful response that violates the API contract", async () => {
    respondWith({ status: "ok", version: 123, uptimeSeconds: -1 });

    await expect(fetchApiHealth()).resolves.toEqual({
      reachable: false,
      reason: "API returned an invalid health report",
    });
  });

  it("survives a refused connection, so the page still renders", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    await expect(fetchApiHealth()).resolves.toEqual({ reachable: false, reason: "fetch failed" });
  });
});
