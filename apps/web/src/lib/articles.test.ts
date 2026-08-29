import { describe, expect, it } from "vitest";
import { fetchArticles, readingMinutes } from "./articles";

describe("readingMinutes", () => {
  it("counts nested ProseMirror text and rounds up", () => {
    expect(
      readingMinutes({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "字".repeat(401) }] }],
      }),
    ).toBe(2);
  });
});

describe("fetchArticles", () => {
  it("rejects a successful response that violates the shared API contract", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ articles: [{ id: "incomplete" }] }), { status: 200 });

    try {
      await expect(fetchArticles("en")).rejects.toThrow();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
