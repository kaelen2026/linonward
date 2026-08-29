import type { Metadata } from "next";
import { EditorWorkbench } from "@/components/editor/editor-workbench";
import { requireAdministrator } from "@/lib/session";
export const metadata: Metadata = { title: "文章管理" };
export default async function AdminPage() {
  const session = await requireAdministrator();
  return <EditorWorkbench authorName={session.user.name} />;
}
