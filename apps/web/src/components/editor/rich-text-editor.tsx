"use client";

import { baseKeymap, lift, setBlockType, toggleMark, wrapIn } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import type { MarkType, NodeType, Schema } from "prosemirror-model";
import { liftListItem, sinkListItem, splitListItem, wrapInList } from "prosemirror-schema-list";
import { type Command, EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useEffect, useRef, useState } from "react";
import type {
  RichTextEditorPlugin,
  RichTextPluginRuntime,
  RichTextToolbarItem,
} from "@/components/editor/rich-text-plugin";
import {
  createRichTextSchema,
  type RichTextDocument,
  starterDocument,
} from "@/components/editor/rich-text-schema";
import { cn } from "@/lib/utils";

export interface RichTextEditorProps {
  "aria-label"?: string;
  initialDocument?: RichTextDocument;
  onChange?: (document: RichTextDocument) => void;
  plugins?: readonly RichTextEditorPlugin[];
}

function requireNode(schema: Schema, name: string): NodeType {
  const node = schema.nodes[name];
  if (!node) throw new Error(`Rich text schema is missing the ${name} node`);
  return node;
}

function requireMark(schema: Schema, name: string): MarkType {
  const mark = schema.marks[name];
  if (!mark) throw new Error(`Rich text schema is missing the ${name} mark`);
  return mark;
}

function markIsActive(state: EditorState, markType: MarkType) {
  const { empty, from, $from, to } = state.selection;
  if (empty) return Boolean(markType.isInSet(state.storedMarks ?? $from.marks()));
  return state.doc.rangeHasMark(from, to, markType);
}

function nodeIsActive(state: EditorState, nodeType: NodeType, attrs?: object) {
  for (let depth = state.selection.$from.depth; depth >= 0; depth -= 1) {
    const node = state.selection.$from.node(depth);
    if (
      node.type === nodeType &&
      (!attrs || Object.entries(attrs).every(([key, value]) => node.attrs[key] === value))
    ) {
      return true;
    }
  }
  return false;
}

function toggleBlock(nodeType: NodeType, paragraph: NodeType, attrs?: object): Command {
  return (state, dispatch, view) => {
    if (nodeIsActive(state, nodeType, attrs)) return setBlockType(paragraph)(state, dispatch, view);
    return setBlockType(nodeType, attrs)(state, dispatch, view);
  };
}

function toggleWrappedBlock(nodeType: NodeType): Command {
  return (state, dispatch, view) => {
    if (nodeIsActive(state, nodeType)) return lift(state, dispatch, view);
    return wrapIn(nodeType)(state, dispatch, view);
  };
}

function toggleList(nodeType: NodeType, listItem: NodeType): Command {
  return (state, dispatch, view) => {
    if (nodeIsActive(state, nodeType)) return liftListItem(listItem)(state, dispatch, view);
    return wrapInList(nodeType)(state, dispatch, view);
  };
}

function createCoreRuntime(schema: Schema): RichTextPluginRuntime {
  const blockquote = requireNode(schema, "blockquote");
  const bulletList = requireNode(schema, "bullet_list");
  const heading = requireNode(schema, "heading");
  const listItem = requireNode(schema, "list_item");
  const orderedList = requireNode(schema, "ordered_list");
  const paragraph = requireNode(schema, "paragraph");
  const em = requireMark(schema, "em");
  const strong = requireMark(schema, "strong");

  return {
    keymap: {
      Enter: splitListItem(listItem),
      "Mod-[": liftListItem(listItem),
      "Mod-]": sinkListItem(listItem),
      "Mod-z": undo,
      "Shift-Mod-z": redo,
      "Mod-y": redo,
    },
    plugins: [history()],
    toolbar: [
      {
        active: (state) => markIsActive(state, strong),
        command: toggleMark(strong),
        id: "strong",
        label: "粗体",
        shortcut: "⌘B",
      },
      {
        active: (state) => markIsActive(state, em),
        command: toggleMark(em),
        id: "emphasis",
        label: "斜体",
        shortcut: "⌘I",
      },
      {
        active: (state) => nodeIsActive(state, heading, { level: 1 }),
        command: toggleBlock(heading, paragraph, { level: 1 }),
        id: "heading-1",
        label: "一级标题",
      },
      {
        active: (state) => nodeIsActive(state, heading, { level: 2 }),
        command: toggleBlock(heading, paragraph, { level: 2 }),
        id: "heading-2",
        label: "二级标题",
      },
      {
        active: (state) => nodeIsActive(state, blockquote),
        command: toggleWrappedBlock(blockquote),
        id: "blockquote",
        label: "引用",
      },
      {
        active: (state) => nodeIsActive(state, bulletList),
        command: toggleList(bulletList, listItem),
        id: "bullet-list",
        label: "无序列表",
      },
      {
        active: (state) => nodeIsActive(state, orderedList),
        command: toggleList(orderedList, listItem),
        id: "ordered-list",
        label: "有序列表",
      },
      { command: undo, id: "undo", label: "撤销", shortcut: "⌘Z" },
      { command: redo, id: "redo", label: "重做", shortcut: "⇧⌘Z" },
    ],
  };
}

function validatePlugins(plugins: readonly RichTextEditorPlugin[]) {
  const ids = new Set<string>();
  for (const plugin of plugins) {
    if (ids.has(plugin.id)) throw new Error(`Duplicate rich text plugin id: ${plugin.id}`);
    ids.add(plugin.id);
  }
}

export function RichTextEditor({
  "aria-label": ariaLabel = "富文本编辑器",
  initialDocument = starterDocument,
  onChange,
  plugins = [],
}: RichTextEditorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const initialDocumentRef = useRef(initialDocument);
  const onChangeRef = useRef(onChange);
  const configurationRef = useRef<{
    runtimes: readonly RichTextPluginRuntime[];
    schema: Schema;
  } | null>(null);
  if (!configurationRef.current) {
    validatePlugins(plugins);
    const schema = createRichTextSchema(plugins);
    const runtimes = [
      createCoreRuntime(schema),
      ...plugins.map((plugin) => plugin.create?.(schema) ?? {}),
    ];
    const toolbarIds = new Set<string>();
    for (const item of runtimes.flatMap((runtime) => runtime.toolbar ?? [])) {
      if (toolbarIds.has(item.id)) throw new Error(`Duplicate rich text toolbar id: ${item.id}`);
      toolbarIds.add(item.id);
    }
    configurationRef.current = { runtimes, schema };
  }
  const configuration = configurationRef.current;
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [, setRevision] = useState(0);

  onChangeRef.current = onChange;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const { runtimes, schema } = configuration;

    const state = EditorState.create({
      doc: schema.nodeFromJSON(initialDocumentRef.current),
      plugins: [
        ...runtimes.flatMap((runtime) => runtime.plugins ?? []),
        ...runtimes
          .map((runtime) => runtime.keymap)
          .filter((bindings) => bindings !== undefined)
          .map((bindings) => keymap(bindings)),
        keymap(baseKeymap),
      ],
    });

    const view = new EditorView(mount, {
      attributes: {
        "aria-label": ariaLabel,
        "aria-multiline": "true",
        role: "textbox",
        spellcheck: "true",
      },
      dispatchTransaction(transaction) {
        const nextState = view.state.apply(transaction);
        view.updateState(nextState);
        for (const runtime of runtimes) runtime.onTransaction?.(transaction, view);
        setRevision((revision) => revision + 1);
        if (transaction.docChanged) onChangeRef.current?.(nextState.doc.toJSON());
      },
      state,
    });

    setEditorView(view);
    for (const runtime of runtimes) runtime.onCreate?.(view);
    return () => {
      for (const runtime of [...runtimes].reverse()) runtime.onDestroy?.(view);
      view.destroy();
    };
  }, [ariaLabel, configuration]);

  const state = editorView?.state;
  const toolbarGroups: readonly (readonly RichTextToolbarItem[])[] = configuration.runtimes
    .map((runtime) => runtime.toolbar ?? [])
    .filter((group) => group.length > 0);
  const characterCount = state?.doc.textBetween(0, state.doc.content.size, " ").length ?? 0;

  function run(command: Command) {
    if (!editorView) return;
    editorView.focus();
    command(editorView.state, editorView.dispatch, editorView);
  }

  return (
    <section
      aria-label="富文本编辑区"
      className="overflow-hidden rounded-lg border border-border bg-background"
    >
      <div
        aria-label="格式工具栏"
        className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/60 p-2"
        role="toolbar"
      >
        {toolbarGroups.map((group, groupIndex) => (
          <div className="flex items-center gap-1" key={group[0]?.id}>
            {groupIndex > 0 ? (
              <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
            ) : null}
            {group.map((item) => {
              const active = state ? item.active?.(state) === true : false;
              const enabled = state ? item.command(state) : false;
              return (
                <button
                  aria-label={item.shortcut ? `${item.label}（${item.shortcut}）` : item.label}
                  aria-pressed={item.active ? active : undefined}
                  className={cn(
                    "min-h-9 rounded-md px-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-background hover:text-foreground",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                  disabled={!enabled}
                  key={item.id}
                  onClick={() => run(item.command)}
                  onMouseDown={(event) => event.preventDefault()}
                  type="button"
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="rich-text-editor" ref={mountRef} />

      <footer className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <span>支持 Markdown 风格快捷键与常用编辑快捷键</span>
        <output aria-live="polite">{characterCount} 个字符</output>
      </footer>
    </section>
  );
}
