import { Activity, AlertTriangle, ExternalLink, Gauge, Radio, Timer } from "lucide-react";

import type { ObservabilitySnapshot } from "@/lib/observability";
import { observabilityLinks } from "@/lib/observability";

function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: digits }).format(value);
}

function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  danger = false,
}: {
  label: string;
  value: string;
  unit: string;
  icon: typeof Activity;
  danger?: boolean;
}) {
  return (
    <div className="border border-border bg-card p-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <Icon aria-hidden="true" className="size-4" />
      </div>
      <p className={`mt-5 text-3xl font-semibold tabular-nums ${danger ? "text-destructive" : ""}`}>
        {value} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </p>
      <p className="mt-2 text-xs text-muted-foreground">过去 5 分钟</p>
    </div>
  );
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function TrendChart({ values, unit }: { values: number[]; unit: string }) {
  const width = 640;
  const height = 180;
  const maximum = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = values.length > 1 ? (index / (values.length - 1)) * width : 0;
      const y = height - (value / maximum) * (height - 20) - 10;
      return `${x},${y}`;
    })
    .join(" ");
  if (!values.length) return <EmptyPanel>等待趋势数据</EmptyPanel>;
  return (
    <div className="px-5 pb-5 pt-4">
      <svg
        aria-label={`最近 15 分钟趋势，单位 ${unit}`}
        className="h-48 w-full"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <title>最近 15 分钟趋势</title>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            className="stroke-border"
            key={ratio}
            x1="0"
            x2={width}
            y1={height * ratio}
            y2={height * ratio}
          />
        ))}
        <polyline
          className="fill-none stroke-brand [stroke-width:3]"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>15 分钟前</span>
        <span>
          现在 · 峰值 {formatNumber(maximum)} {unit}
        </span>
      </div>
    </div>
  );
}

export function ObservabilityDashboard({ snapshot }: { snapshot: ObservabilitySnapshot }) {
  return (
    <div className="space-y-8">
      {!snapshot.reachable ? (
        <div className="flex gap-3 border border-amber-500/40 bg-amber-500/8 p-4 text-sm">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">Prometheus 暂不可用</p>
            <p className="mt-1 text-muted-foreground">
              当前不展示模拟数据。请启动 observability profile；错误：{snapshot.reason}
            </p>
          </div>
        </div>
      ) : null}

      <section
        aria-label="关键指标"
        className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          icon={Radio}
          label="请求速率"
          unit="req/s"
          value={formatNumber(snapshot.requestsPerSecond)}
        />
        <MetricCard
          danger={snapshot.errorRatePercent > 5}
          icon={Activity}
          label="5xx 错误率"
          unit="%"
          value={formatNumber(snapshot.errorRatePercent, 2)}
        />
        <MetricCard
          icon={Timer}
          label="P95 延迟"
          unit="ms"
          value={formatNumber(snapshot.p95LatencyMs, 0)}
        />
        <MetricCard
          icon={Gauge}
          label="活跃请求"
          unit="个"
          value={formatNumber(snapshot.activeRequests, 0)}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2" aria-label="趋势图">
        <div className="border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">请求速率趋势</h2>
            <p className="mt-1 text-xs text-muted-foreground">最近 15 分钟 · 30 秒粒度</p>
          </div>
          <TrendChart unit="req/s" values={snapshot.requestRateSeries} />
        </div>
        <div className="border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">P95 延迟趋势</h2>
            <p className="mt-1 text-xs text-muted-foreground">最近 15 分钟 · 30 秒粒度</p>
          </div>
          <TrendChart unit="ms" values={snapshot.latencySeries} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
        <section className="min-w-0 border border-border bg-card" aria-labelledby="route-heading">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="font-semibold" id="route-heading">
                按路由明细
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">按最近 5 分钟请求速率排序</p>
            </div>
            <a
              className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
              href={observabilityLinks.prometheus}
              rel="noreferrer"
              target="_blank"
            >
              Prometheus <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          </div>
          {snapshot.routes.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">方法</th>
                    <th className="px-5 py-3 font-medium">路由</th>
                    <th className="px-5 py-3 font-medium">状态</th>
                    <th className="px-5 py-3 text-right font-medium">请求速率</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.routes.map((route) => (
                    <tr
                      className="border-t border-border first:border-t-0"
                      key={`${route.method}-${route.route}-${route.status}`}
                    >
                      <td className="px-5 py-3 font-mono text-xs">{route.method}</td>
                      <td className="px-5 py-3 font-mono text-xs">{route.route}</td>
                      <td
                        className={`px-5 py-3 font-mono text-xs ${route.status.startsWith("5") ? "text-destructive" : ""}`}
                      >
                        {route.status}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs tabular-nums">
                        {formatNumber(route.requestsPerSecond, 3)} req/s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel>暂无路由指标</EmptyPanel>
          )}
        </section>

        <section className="min-w-0 border border-border bg-card" aria-labelledby="alert-heading">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold" id="alert-heading">
              当前告警
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">由当前 RED 阈值即时判断</p>
          </div>
          <div className="divide-y divide-border">
            {snapshot.errorRatePercent > 5 ? (
              <AlertRow
                label="5xx 错误率超过 5%"
                value={`${formatNumber(snapshot.errorRatePercent, 2)}%`}
              />
            ) : null}
            {snapshot.p95LatencyMs > 1000 ? (
              <AlertRow
                label="P95 延迟超过 1 秒"
                value={`${formatNumber(snapshot.p95LatencyMs, 0)} ms`}
              />
            ) : null}
            {snapshot.reachable &&
            snapshot.errorRatePercent <= 5 &&
            snapshot.p95LatencyMs <= 1000 ? (
              <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
                <span className="mb-3 size-2.5 rounded-full bg-emerald-500" />
                <p className="font-medium">所有指标正常</p>
                <p className="mt-1 text-xs text-muted-foreground">当前没有触发告警阈值</p>
              </div>
            ) : null}
            {!snapshot.reachable ? <EmptyPanel>等待监控数据</EmptyPanel> : null}
          </div>
        </section>
      </div>

      <section className="min-w-0 border border-border bg-card" aria-labelledby="trace-heading">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold" id="trace-heading">
              最近 Trace
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Web 请求上下文与 API 服务端 Span</p>
          </div>
          <a
            className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
            href={observabilityLinks.grafana}
            rel="noreferrer"
            target="_blank"
          >
            在 Grafana 中查询 <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        </div>
        {snapshot.traces.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Trace ID</th>
                  <th className="px-5 py-3 font-medium">入口 Span</th>
                  <th className="px-5 py-3 text-right font-medium">持续时间</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.traces.map((trace) => (
                  <tr className="border-t border-border first:border-t-0" key={trace.traceId}>
                    <td className="px-5 py-3 font-mono text-xs">{trace.traceId}</td>
                    <td className="px-5 py-3 font-mono text-xs">{trace.route}</td>
                    <td className="px-5 py-3 text-right font-mono text-xs">
                      {formatNumber(trace.durationMs, 0)} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPanel>暂无 Trace；发起一次 Web/API 请求后将在此显示</EmptyPanel>
        )}
      </section>
    </div>
  );
}

function AlertRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">当前值 {value}</p>
      </div>
    </div>
  );
}
