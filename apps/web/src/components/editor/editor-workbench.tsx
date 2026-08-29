"use client";

import { EditorWorkbenchView } from "./editor-workbench-view";
import { useEditorWorkbench } from "./use-editor-workbench";

export function EditorWorkbench({
  authorName,
  canPublish,
}: {
  authorName: string;
  canPublish: boolean;
}) {
  const workbench = useEditorWorkbench(authorName);
  return <EditorWorkbenchView {...workbench} canPublish={canPublish} />;
}
