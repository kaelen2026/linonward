import type { MarkSpec, NodeSpec, Schema } from "prosemirror-model";
import type { Command, EditorState, Plugin, Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

export interface RichTextSchemaItem<T> {
  before?: string;
  name: string;
  spec: T;
}

export interface RichTextToolbarItem {
  active?: (state: EditorState) => boolean;
  command: Command;
  id: string;
  label: string;
  shortcut?: string;
}

export interface RichTextPluginRuntime {
  keymap?: Readonly<Record<string, Command>>;
  onCreate?: (view: EditorView) => void;
  onDestroy?: (view: EditorView) => void;
  onTransaction?: (transaction: Transaction, view: EditorView) => void;
  plugins?: readonly Plugin[];
  toolbar?: readonly RichTextToolbarItem[];
}

export interface RichTextEditorPlugin {
  create?: (schema: Schema) => RichTextPluginRuntime;
  id: string;
  marks?: readonly RichTextSchemaItem<MarkSpec>[];
  nodes?: readonly RichTextSchemaItem<NodeSpec>[];
}
