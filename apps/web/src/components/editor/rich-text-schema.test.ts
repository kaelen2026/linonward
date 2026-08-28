import { describe, expect, it } from "vitest";

import type { RichTextEditorPlugin } from "@/components/editor/rich-text-plugin";
import {
  createRichTextSchema,
  richTextSchema,
  starterDocument,
} from "@/components/editor/rich-text-schema";

describe("richTextSchema", () => {
  it("round-trips the starter document as ProseMirror JSON", () => {
    const document = richTextSchema.nodeFromJSON(starterDocument);

    expect(document.toJSON()).toEqual(starterDocument);
    expect(document.textContent).toContain("从这里开始写作");
  });

  it("supports ordered and unordered list structures", () => {
    expect(richTextSchema.nodes.bullet_list).toBeDefined();
    expect(richTextSchema.nodes.ordered_list).toBeDefined();
    expect(richTextSchema.nodes.list_item).toBeDefined();
  });

  it("composes schema marks supplied by an editor plugin", () => {
    const plugin: RichTextEditorPlugin = {
      id: "test-highlight",
      marks: [{ name: "highlight", spec: { toDOM: () => ["mark", 0] } }],
    };

    expect(createRichTextSchema([plugin]).marks.highlight).toBeDefined();
  });
});
