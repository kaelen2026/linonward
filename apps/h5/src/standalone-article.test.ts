import { describe, expect, it } from "vitest";
import { articleApiUrl, articleDeepLinkUrl, richTextToHtml } from "./standalone-article";

describe("richTextToHtml", () => {
  it("renders supported rich text and escapes executable markup", () => {
    expect(
      richTextToHtml({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "<script>", marks: [{ type: "strong" }] },
              { type: "hard_break" },
              { type: "text", text: "正文", marks: [{ type: "em" }] },
            ],
          },
        ],
      }),
    ).toBe("<p><strong>&lt;script&gt;</strong><br><em>正文</em></p>");
  });
});

describe("standalone article links", () => {
  it("requests the published article by slug and locale", () => {
    expect(articleApiUrl("hello-world", "en", "https://api.linonward.com/")).toBe(
      "https://api.linonward.com/api/content/articles/hello-world?locale=en",
    );
  });

  it("opens the same article in the native app", () => {
    expect(articleDeepLinkUrl("hello-world", "zh")).toBe(
      "linonward://article/hello-world?locale=zh",
    );
  });
});
