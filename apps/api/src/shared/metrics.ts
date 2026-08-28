export type Metrics = {
  observeRequest: (method: string, path: string, status: number, durationMs: number) => void;
  render: () => string;
};

export function createInMemoryMetrics(): Metrics {
  const requests = new Map<string, number>();
  return {
    observeRequest(method, path, status) {
      const key = `${method}|${path}|${status}`;
      requests.set(key, (requests.get(key) ?? 0) + 1);
    },
    render() {
      const lines = [
        "# HELP linonward_http_requests_total HTTP requests completed by route and status.",
        "# TYPE linonward_http_requests_total counter",
      ];
      for (const [key, value] of requests) {
        const [method, path, status] = key.split("|");
        lines.push(
          `linonward_http_requests_total{method="${method}",path="${path}",status="${status}"} ${value}`,
        );
      }
      return `${lines.join("\n")}\n`;
    },
  };
}
