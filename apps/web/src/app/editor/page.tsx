import type { Metadata } from "next";

import { EditorWorkbench } from "@/components/editor/editor-workbench";
import { SiteHeader } from "@/components/site/site-header";
import { requireAdministrator } from "@/lib/session";

export const metadata: Metadata = {
  title: "富文本编辑器",
};

export default async function EditorPage() {
  const session = await requireAdministrator();

  return (
    <>
      <SiteHeader pathname="/editor" userEmail={session.user.email} />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">富文本编辑器</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          基于 ProseMirror 的结构化编辑能力。工具栏只暴露当前内容模型支持的格式，文档以可验证的 JSON
          保存。
        </p>

        <div className="mt-8">
          <EditorWorkbench />
        </div>
      </main>
    </>
  );
}
