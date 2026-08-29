import { describe, expect, it } from "vitest";
import { readingMinutes } from "./articles";

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
