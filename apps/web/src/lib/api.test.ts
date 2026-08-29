import { afterEach, describe, expect, it, vi } from "vitest";

import { apiBaseUrl, apiUrl, requestJson } from "@/lib/api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiUrl", () => {
  it("hangs the path off the configured origin", () => {
    expect(apiUrl("/health")).toBe(`${apiBaseUrl}/health`);
  });

  it("accepts a path that forgot its leading slash", () => {
    expect(apiUrl("health")).toBe(`${apiBaseUrl}/health`);
  });

  it("does not double the slash when the origin carries a trailing one", () => {
    // `NEXT_PUBLIC_API_URL=https://api.example.com/` is the kind of value that
    // arrives from a deploy dashboard, and `//health` is a 404 on most routers.
    expect(apiUrl("/health", "https://api.example.com/")).toBe("https://api.example.com/health");
  });

  it("keeps a base path that is part of the origin", () => {
    expect(apiUrl("/health", "https://example.com/api")).toBe("https://example.com/api/health");
  });
});

describe("requestJson", () => {
  it("returns the parsed JSON response through the shared transport", async () => {
    const fetchMock = vi.fn(async () => Response.json({ status: "ok" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestJson<{ status: string }>("/health")).resolves.toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith("/health", expect.objectContaining({}));
  });

  it("normalizes unsuccessful responses into an HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 403 })),
    );

    await expect(requestJson("/protected")).rejects.toEqual(
      expect.objectContaining({ status: 403 }),
    );
  });

  it("forwards request configuration and adds JSON content type for a body", async () => {
    const fetchMock = vi.fn(async () => Response.json({ saved: true }));
    vi.stubGlobal("fetch", fetchMock);

    await requestJson("/articles", {
      body: JSON.stringify({ title: "Draft" }),
      method: "POST",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/articles",
      expect.objectContaining({
        body: JSON.stringify({ title: "Draft" }),
        headers: expect.objectContaining({ "content-type": "application/json" }),
        method: "POST",
      }),
    );
  });
});
