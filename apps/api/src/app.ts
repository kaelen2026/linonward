import { openApiDocument } from "@linonward/contracts/openapi";
import { context, SpanStatusCode } from "@opentelemetry/api";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";

import { ApiError, toErrorBody } from "./shared/api-error.js";
import { createConsoleLogger, type Logger } from "./shared/logger.js";
import { createInMemoryMetrics, type Metrics } from "./shared/metrics.js";
import { type ApiModule, type AppEnv, mountModules } from "./shared/module.js";
import { startServerTrace } from "./shared/telemetry.js";

export type AppOptions = {
  modules: readonly ApiModule[];
  allowedOrigins: readonly string[];
  logger?: Logger;
  metrics?: Metrics;
};

/**
 * The composition root. It owns the cross-cutting concerns — request identity,
 * CORS, and the single error envelope — and knows nothing about any module
 * beyond the {@link ApiModule} contract.
 */
export function createApp({
  modules,
  allowedOrigins,
  logger = createConsoleLogger(),
  metrics = createInMemoryMetrics(),
}: AppOptions): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use("*", requestId());
  app.use("*", async (c, next) => {
    const serverTrace = startServerTrace(c.req.header("traceparent"), `HTTP ${c.req.method}`);
    const trace = serverTrace.correlation;
    c.set("trace", trace);
    c.header("traceparent", trace.traceparent);
    c.header("x-trace-id", trace.traceId);
    const startedAt = performance.now();
    const shouldObserve = c.req.path !== "/metrics";
    if (shouldObserve) metrics.requestStarted();
    try {
      await context.with(serverTrace.context, next);
    } finally {
      const durationMs = Math.round(performance.now() - startedAt);
      const route = c.req.routePath === "/*" ? "_unmatched" : c.req.routePath || "_unmatched";
      if (shouldObserve) metrics.observeRequest(c.req.method, route, c.res.status, durationMs);
      serverTrace.span.updateName(`${c.req.method} ${route}`);
      serverTrace.span.setAttributes({
        "http.request.method": c.req.method,
        "http.route": route,
        "http.response.status_code": c.res.status,
        "http.request.duration_ms": durationMs,
      });
      if (c.res.status >= 500) serverTrace.span.setStatus({ code: SpanStatusCode.ERROR });
      serverTrace.span.end();
      logger.info("http_request", {
        requestId: c.var.requestId,
        traceId: trace.traceId,
        spanId: trace.spanId,
        method: c.req.method,
        route,
        status: c.res.status,
        durationMs,
      });
    }
  });

  app.get("/openapi.json", (c) => c.json(openApiDocument));
  app.get("/metrics", (c) =>
    c.text(metrics.render(), 200, { "content-type": "text/plain; version=0.0.4; charset=utf-8" }),
  );

  if (allowedOrigins.length > 0) {
    app.use(
      "*",
      cors({
        origin: [...allowedOrigins],
        allowHeaders: ["Content-Type", "Traceparent", "X-Request-Id"],
        exposeHeaders: ["Traceparent", "X-Request-Id", "X-Trace-Id"],
        allowMethods: ["DELETE", "GET", "POST", "PUT", "OPTIONS"],
        credentials: true,
        maxAge: 600,
      }),
    );
  }

  app.notFound((c) =>
    c.json(
      toErrorBody(
        new ApiError(404, "not_found", `No route matches ${c.req.method} ${c.req.path}`),
        c.var.requestId,
      ),
      404,
    ),
  );

  app.onError((cause, c) => {
    if (cause instanceof ApiError) {
      return c.json(toErrorBody(cause, c.var.requestId), cause.status);
    }

    // Anything else is a bug or an outage: log the cause for the operator and
    // hand the client an opaque body, which may otherwise carry a connection
    // string or a stack trace.
    logger.error("http_request_failed", {
      requestId: c.var.requestId,
      traceId: c.var.trace.traceId,
      spanId: c.var.trace.spanId,
      method: c.req.method,
      path: c.req.path,
      error: cause instanceof Error ? cause.name : "unknown",
    });
    return c.json(
      toErrorBody(
        new ApiError(500, "internal_error", "The request could not be completed"),
        c.var.requestId,
      ),
      500,
    );
  });

  return mountModules(app, modules);
}
