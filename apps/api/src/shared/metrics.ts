const durationBucketsMs = [5, 10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000] as const;

export type Metrics = {
  requestStarted: () => void;
  observeRequest: (method: string, route: string, status: number, durationMs: number) => void;
  render: () => string;
};

type Series = { count: number; durationSumMs: number; buckets: number[] };

export function createInMemoryMetrics(): Metrics {
  const requests = new Map<string, Series>();
  let activeRequests = 0;

  return {
    requestStarted() {
      activeRequests += 1;
    },
    observeRequest(method, route, status, durationMs) {
      activeRequests = Math.max(0, activeRequests - 1);
      const key = `${method}|${route}|${status}`;
      const series = requests.get(key) ?? {
        count: 0,
        durationSumMs: 0,
        buckets: durationBucketsMs.map(() => 0),
      };
      series.count += 1;
      series.durationSumMs += durationMs;
      for (const [index, boundary] of durationBucketsMs.entries()) {
        if (durationMs <= boundary) series.buckets[index] = (series.buckets[index] ?? 0) + 1;
      }
      requests.set(key, series);
    },
    render() {
      const lines = [
        "# HELP linonward_http_requests_active HTTP requests currently in flight.",
        "# TYPE linonward_http_requests_active gauge",
        `linonward_http_requests_active ${activeRequests}`,
        "# HELP linonward_http_requests_total HTTP requests completed by route and status.",
        "# TYPE linonward_http_requests_total counter",
      ];
      for (const [key, series] of requests) {
        const [method, route, status] = key.split("|");
        const labels = `method="${method}",route="${route}",status="${status}"`;
        lines.push(`linonward_http_requests_total{${labels}} ${series.count}`);
      }
      lines.push(
        "# HELP linonward_http_request_duration_milliseconds HTTP request latency in milliseconds.",
        "# TYPE linonward_http_request_duration_milliseconds histogram",
      );
      for (const [key, series] of requests) {
        const [method, route, status] = key.split("|");
        const labels = `method="${method}",route="${route}",status="${status}"`;
        for (const [index, boundary] of durationBucketsMs.entries()) {
          lines.push(
            `linonward_http_request_duration_milliseconds_bucket{${labels},le="${boundary}"} ${series.buckets[index] ?? 0}`,
          );
        }
        lines.push(
          `linonward_http_request_duration_milliseconds_bucket{${labels},le="+Inf"} ${series.count}`,
          `linonward_http_request_duration_milliseconds_sum{${labels}} ${series.durationSumMs}`,
          `linonward_http_request_duration_milliseconds_count{${labels}} ${series.count}`,
        );
      }
      return `${lines.join("\n")}\n`;
    },
  };
}
