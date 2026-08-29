import { describe, expect, it } from "vitest";
import { isArticlePayload, normalizeSettings, sanitizeArticleHtml } from "./article";

describe("sanitizeArticleHtml", () => {
  it("removes executable article content", () => {
    const html = sanitizeArticleHtml(
      '<p onclick="alert(1)">Safe</p><script>alert(1)</script><img src="x" onerror="alert(1)">',
    );

    expect(html).toContain("<p>Safe</p>");
    expect(html).not.toContain("script");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("onerror");
  });
});

describe("isArticlePayload", () => {
  it("accepts the minimum supported article contract", () => {
    expect(
      isArticlePayload({ article: { id: "1", title: "Title", contentHtml: "<p>Body</p>" } }),
    ).toBe(true);
  });

  it("rejects an article without HTML content", () => {
    expect(isArticlePayload({ article: { id: "1", title: "Title" } })).toBe(false);
  });

  it("rejects executable cover URLs", () => {
    expect(
      isArticlePayload({
        article: {
          id: "1",
          title: "Title",
          contentHtml: "<p>Body</p>",
          cover: { alt: "cover", url: "javascript:alert(1)" },
        },
      }),
    ).toBe(false);
  });
});

describe("normalizeSettings", () => {
  it("clamps the native font scale to a readable range", () => {
    expect(normalizeSettings({ fontScale: 4 }).fontScale).toBe(1.3);
    expect(normalizeSettings({ fontScale: 0.2 }).fontScale).toBe(0.85);
  });
});
