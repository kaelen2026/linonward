"use client";

import { EditorWorkbenchView } from "./editor-workbench-view";
import { useEditorWorkbench } from "./use-editor-workbench";

export function EditorWorkbench({
  authorName,
  canPublish,
  userEmail,
  userImage,
  userName,
}: {
  authorName: string;
  canPublish: boolean;
  userEmail: string;
  userImage?: string | null;
  userName: string;
}) {
  const workbench = useEditorWorkbench(authorName);
  return (
    <EditorWorkbenchView
      {...workbench}
      canPublish={canPublish}
      userEmail={userEmail}
      userImage={userImage}
      userName={userName}
    />
  );
}
