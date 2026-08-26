import type { Metadata } from "next";

import { SiteHeader } from "@/components/site/site-header";
import { apiBaseUrl } from "@/lib/api";
import { fetchApiHealth } from "@/lib/health";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "状态",
};

// The answer is only true at the moment it is asked, so this page is never
// prerendered — `fetchApiHealth` opts its request out of the cache as well.
export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const [session, health] = await Promise.all([requireSession(), fetchApiHealth()]);

  return (
    <>
      <SiteHeader pathname="/status" userEmail={session.user.email} />

      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">后端状态</h1>
        <p className="mt-3 text-muted-foreground">
          来自 <code className="font-mono text-sm break-all">{apiBaseUrl}/health</code>。
        </p>

        <div className="mt-10 rounded-lg border border-border p-6">
          {health.reachable ? (
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-muted-foreground">状态</dt>
                <dd className="mt-1 font-medium">{health.status}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">版本</dt>
                <dd className="mt-1 font-mono text-sm">{health.version}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">运行时长</dt>
                <dd className="mt-1 font-mono text-sm">{health.uptimeSeconds} 秒</dd>
              </div>
            </dl>
          ) : (
            <p>
              无法连接后端：<span className="font-mono text-sm">{health.reason}</span>
              。请确认 <code className="font-mono text-sm">pnpm --filter @linonward/api dev</code>{" "}
              正在运行。
            </p>
          )}
        </div>
      </main>
    </>
  );
}
