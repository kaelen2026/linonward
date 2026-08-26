import { Hono } from "hono";

import type { ApiModule, AppEnv } from "../../shared/module.js";

export type AuthHandler = (request: Request) => Promise<Response> | Response;

export function createAuthModule({ handler }: { handler: AuthHandler }): ApiModule {
  const routes = new Hono<AppEnv>();
  routes.all("/*", (c) => handler(c.req.raw));

  return { name: "auth", basePath: "/api/auth", routes };
}
