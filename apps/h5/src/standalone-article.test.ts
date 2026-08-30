import { describe, expect, it } from "vitest";
import { richTextToHtml } from "./standalone-article";

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
