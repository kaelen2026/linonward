import Link from "next/link";

import { SiteHeader } from "@/components/site/site-header";
import { apiBaseUrl } from "@/lib/api";
import { requireAdministrator } from "@/lib/session";

export default async function HomePage() {
  const session = await requireAdministrator();
  return (
    <>
      <SiteHeader pathname="/" userEmail={session.user.email} />

      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">LinOnward Web</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          面向内部的 Next.js 应用，与 <code className="font-mono text-sm">apps/api</code>{" "}
          对话。公开站点在 <code className="font-mono text-sm">apps/www</code>。
        </p>

        <dl className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <dt className="text-sm text-muted-foreground">API 地址</dt>
            <dd className="mt-1 font-mono text-sm break-all">{apiBaseUrl}</dd>
          </div>
          <div className="rounded-lg border border-border p-4">
            <dt className="text-sm text-muted-foreground">后端状态</dt>
            <dd className="mt-1 text-sm">
              <Link className="underline underline-offset-4" href="/status">
                查看状态页
              </Link>
            </dd>
          </div>
        </dl>
      </main>
    </>
  );
}
