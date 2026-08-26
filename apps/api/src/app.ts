import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";

import { ApiError, toErrorBody } from "./shared/api-error.js";
import { type ApiModule, type AppEnv, mountModules } from "./shared/module.js";

export type AppOptions = {
  modules: readonly ApiModule[];
  allowedOrigins: readonly string[];
};

/**
 * The composition root. It owns the cross-cutting concerns — request identity,
 * CORS, and the single error envelope — and knows nothing about any module
 * beyond the {@link ApiModule} contract.
 */
export function createApp({ modules, allowedOrigins }: AppOptions): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use("*", requestId());

  if (allowedOrigins.length > 0) {
    app.use(
      "*",
      cors({
        origin: [...allowedOrigins],
        allowHeaders: ["Content-Type"],
        allowMethods: ["GET", "POST", "OPTIONS"],
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
    console.error(`[${c.var.requestId}] ${c.req.method} ${c.req.path} failed`, cause);
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
