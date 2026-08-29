const prometheusUrl = (process.env.PROMETHEUS_URL ?? "http://localhost:9090").replace(/\/+$/, "");
const tempoUrl = (process.env.TEMPO_URL ?? "http://localhost:3200").replace(/\/+$/, "");

type PrometheusResult = { metric: Record<string, string>; value: [number, string] };
type PrometheusResponse = { status?: string; data?: { result?: PrometheusResult[] } };
type PrometheusRangeResult = { values?: [number, string][] };
type PrometheusRangeResponse = { status?: string; data?: { result?: PrometheusRangeResult[] } };

export type RouteMetric = {
  method: string;
  route: string;
  status: string;
  requestsPerSecond: number;
};

export type TraceSummary = {
  traceId: string;
  route: string;
  durationMs: number;
};

export type ObservabilitySnapshot = {
  reachable: boolean;
  requestsPerSecond: number;
  errorRatePercent: number;
  p95LatencyMs: number;
  activeRequests: number;
  routes: RouteMetric[];
  traces: TraceSummary[];
  requestRateSeries: number[];
  latencySeries: number[];
  reason?: string;
};

const queries = {
  requestsPerSecond: "sum(rate(linonward_http_requests_total[5m]))",
  errorRatePercent:
    '100 * sum(rate(linonward_http_requests_total{status=~"5.."}[5m])) / clamp_min(sum(rate(linonward_http_requests_total[5m])), 0.001)',
  p95LatencyMs:
    "histogram_quantile(0.95, sum by (le) (rate(linonward_http_request_duration_milliseconds_bucket[5m])))",
  activeRequests: "sum(linonward_http_requests_active)",
  routes: "sum by (method, route, status) (rate(linonward_http_requests_total[5m]))",
} as const;

async function prometheusQuery(query: string): Promise<PrometheusResult[]> {
  const url = new URL("/api/v1/query", prometheusUrl);
  url.searchParams.set("query", query);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(3_000) });
  if (!response.ok) throw new Error(`Prometheus returned ${response.status}`);
  const body = (await response.json()) as PrometheusResponse;
  if (body.status !== "success") throw new Error("Prometheus query failed");
  return body.data?.result ?? [];
}

async function prometheusRangeQuery(query: string): Promise<number[]> {
  const end = Math.floor(Date.now() / 1_000);
  const url = new URL("/api/v1/query_range", prometheusUrl);
  url.searchParams.set("query", query);
  url.searchParams.set("start", String(end - 15 * 60));
  url.searchParams.set("end", String(end));
  url.searchParams.set("step", "30");
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(3_000) });
  if (!response.ok) throw new Error(`Prometheus returned ${response.status}`);
  const body = (await response.json()) as PrometheusRangeResponse;
  if (body.status !== "success") throw new Error("Prometheus range query failed");
  return (body.data?.result?.[0]?.values ?? []).map((entry) => Number(entry[1]) || 0);
}

function value(result: PrometheusResult[]): number {
  const parsed = Number(result[0]?.value[1] ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchRecentTraces(): Promise<TraceSummary[]> {
  try {
    const url = new URL("/api/search", tempoUrl);
    url.searchParams.set("q", '{ resource.service.name = "linonward-api" }');
    url.searchParams.set("limit", "8");
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(3_000) });
    if (!response.ok) return [];
    const body = (await response.json()) as {
      traces?: { traceID?: unknown; rootTraceName?: unknown; durationMs?: unknown }[];
    };
    return (body.traces ?? []).flatMap((trace) =>
      typeof trace.traceID === "string"
        ? [
            {
              traceId: trace.traceID,
              route: typeof trace.rootTraceName === "string" ? trace.rootTraceName : "—",
              durationMs: Number(trace.durationMs) || 0,
            },
          ]
        : [],
    );
  } catch {
    return [];
  }
}

export async function fetchObservabilitySnapshot(): Promise<ObservabilitySnapshot> {
  try {
    const [
      requestRate,
      errorRate,
      latency,
      active,
      routeResults,
      requestRateSeries,
      latencySeries,
      traces,
    ] = await Promise.all([
      prometheusQuery(queries.requestsPerSecond),
      prometheusQuery(queries.errorRatePercent),
      prometheusQuery(queries.p95LatencyMs),
      prometheusQuery(queries.activeRequests),
      prometheusQuery(queries.routes),
      prometheusRangeQuery(queries.requestsPerSecond),
      prometheusRangeQuery(queries.p95LatencyMs),
      fetchRecentTraces(),
    ]);
    return {
      reachable: true,
      requestsPerSecond: value(requestRate),
      errorRatePercent: value(errorRate),
      p95LatencyMs: value(latency),
      activeRequests: value(active),
      routes: routeResults
        .map((result) => ({
          method: result.metric.method ?? "—",
          route: result.metric.route ?? "—",
          status: result.metric.status ?? "—",
          requestsPerSecond: Number(result.value[1]) || 0,
        }))
        .sort((left, right) => right.requestsPerSecond - left.requestsPerSecond)
        .slice(0, 10),
      traces,
      requestRateSeries,
      latencySeries,
    };
  } catch (error) {
    return {
      reachable: false,
      requestsPerSecond: 0,
      errorRatePercent: 0,
      p95LatencyMs: 0,
      activeRequests: 0,
      routes: [],
      traces: [],
      requestRateSeries: [],
      latencySeries: [],
      reason: error instanceof Error ? error.message : "监控服务不可用",
    };
  }
}

export const observabilityLinks = {
  grafana: process.env.GRAFANA_URL ?? "http://localhost:3003",
  prometheus: process.env.PROMETHEUS_PUBLIC_URL ?? "http://localhost:9090",
};
