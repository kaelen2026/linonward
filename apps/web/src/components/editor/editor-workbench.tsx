"use client";

import { useState } from "react";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const workbench = useEditorWorkbench(authorName);
  return (
    <EditorWorkbenchView
      {...workbench}
      canPublish={canPublish}
      onToggleSidebar={() => setSidebarCollapsed((collapsed) => !collapsed)}
      sidebarCollapsed={sidebarCollapsed}
      userEmail={userEmail}
      userImage={userImage}
      userName={userName}
    />
  );
}
