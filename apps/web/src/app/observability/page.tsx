import type { Metadata } from "next";

import { AutoRefresh } from "@/components/observability/auto-refresh";
import { ObservabilityDashboard } from "@/components/observability/observability-dashboard";
import { SiteHeader } from "@/components/site/site-header";
import { fetchObservabilitySnapshot } from "@/lib/observability";
import { requireAdministrator } from "@/lib/session";

export const metadata: Metadata = { title: "可观测性" };
export const dynamic = "force-dynamic";

export default async function ObservabilityPage() {
  const [session, snapshot] = await Promise.all([
    requireAdministrator(),
    fetchObservabilitySnapshot(),
  ]);

  return (
    <>
      <AutoRefresh />
      <SiteHeader pathname="/observability" userEmail={session.user.email} />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">可观测性</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Web → API 请求、指标、告警与 Trace 的统一运行视图。
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={`size-2 rounded-full ${snapshot.reachable ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            {snapshot.reachable ? "实时数据" : "数据源离线"}
            <span>·</span>
            <span>自动刷新 30 秒</span>
          </div>
        </div>
        <ObservabilityDashboard snapshot={snapshot} />
      </main>
    </>
  );
}
