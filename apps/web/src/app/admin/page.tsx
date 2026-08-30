import type { Metadata } from "next";
import { EditorWorkbench } from "@/components/editor/editor-workbench";
import { hasContentCapability } from "@/lib/authorization";
import { requireContentManager } from "@/lib/session";
export const metadata: Metadata = { title: "文章管理" };
export default async function AdminPage() {
  const { access, session } = await requireContentManager();
  return (
    <EditorWorkbench
      authorName={session.user.name}
      canPublish={hasContentCapability(access, "article.publish")}
      userEmail={session.user.email}
      userImage={session.user.image}
      userName={session.user.name}
    />
  );
}
