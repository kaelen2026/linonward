"use client";

import { useState } from "react";

import { highlightPlugin } from "@/components/editor/highlight-plugin";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { type RichTextDocument, starterDocument } from "@/components/editor/rich-text-schema";

export function EditorWorkbench() {
  const [document, setDocument] = useState<RichTextDocument>(starterDocument);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <RichTextEditor
        initialDocument={starterDocument}
        onChange={setDocument}
        plugins={[highlightPlugin]}
      />

      <aside className="rounded-lg border border-border bg-muted/40 p-4">
        <h2 className="text-sm font-semibold">文档数据</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          页面暂不持久化；此处展示可提交给 API 的 ProseMirror JSON。
        </p>
        <pre className="mt-4 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5">
          {JSON.stringify(document, null, 2)}
        </pre>
      </aside>
    </div>
  );
}
