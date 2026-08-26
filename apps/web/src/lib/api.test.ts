import { describe, expect, it } from "vitest";

import { apiBaseUrl, apiUrl } from "@/lib/api";

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
