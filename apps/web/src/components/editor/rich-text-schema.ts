import { type Node as ProseMirrorNode, Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";

import type { RichTextEditorPlugin } from "@/components/editor/rich-text-plugin";

export function createRichTextSchema(plugins: readonly RichTextEditorPlugin[] = []): Schema {
  let nodes = addListNodes(basicSchema.spec.nodes, "paragraph block*", "block");
  let marks = basicSchema.spec.marks;

  for (const plugin of plugins) {
    for (const node of plugin.nodes ?? []) {
      if (nodes.get(node.name)) throw new Error(`Rich text node already exists: ${node.name}`);
      nodes = node.before
        ? nodes.addBefore(node.before, node.name, node.spec)
        : nodes.append({ [node.name]: node.spec });
    }
    for (const mark of plugin.marks ?? []) {
      if (marks.get(mark.name)) throw new Error(`Rich text mark already exists: ${mark.name}`);
      marks = mark.before
        ? marks.addBefore(mark.before, mark.name, mark.spec)
        : marks.append({ [mark.name]: mark.spec });
    }
  }

  return new Schema({ nodes, marks });
}

export const richTextSchema = createRichTextSchema();

export type RichTextDocument = ReturnType<ProseMirrorNode["toJSON"]>;

export const starterDocument: RichTextDocument = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "从这里开始写作" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "选择文字后使用工具栏设置格式，内容会以 " },
        { type: "text", marks: [{ type: "strong" }], text: "ProseMirror JSON" },
        { type: "text", text: " 表示。" },
      ],
    },
  ],
};
