import { toggleMark } from "prosemirror-commands";
import type { MarkType } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";

import type { RichTextEditorPlugin } from "@/components/editor/rich-text-plugin";

function isActive(state: EditorState, mark: MarkType) {
  const { $from, empty, from, to } = state.selection;
  if (empty) return Boolean(mark.isInSet(state.storedMarks ?? $from.marks()));
  return state.doc.rangeHasMark(from, to, mark);
}

export const highlightPlugin: RichTextEditorPlugin = {
  id: "highlight",
  marks: [
    {
      name: "highlight",
      spec: {
        parseDOM: [{ tag: "mark" }],
        toDOM: () => ["mark", 0],
      },
    },
  ],
  create(schema) {
    const highlight = schema.marks.highlight;
    if (!highlight) throw new Error("Highlight plugin mark is missing from the schema");
    return {
      keymap: { "Mod-Shift-h": toggleMark(highlight) },
      toolbar: [
        {
          active: (state) => isActive(state, highlight),
          command: toggleMark(highlight),
          id: "highlight",
          label: "高亮",
          shortcut: "⇧⌘H",
        },
      ],
    };
  },
};
