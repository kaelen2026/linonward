import { Hono } from "hono";

import type { AppEnv } from "../../shared/module.js";
import type { HealthService } from "./service.js";

export function createHealthRoutes(service: HealthService): Hono<AppEnv> {
  return new Hono<AppEnv>().get("/", (c) => c.json(service.check()));
}
