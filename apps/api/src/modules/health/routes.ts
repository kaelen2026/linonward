import { Hono } from "hono";

import type { AppEnv } from "../../shared/module.js";
import type { HealthService } from "./service.js";

export function createHealthRoutes(service: HealthService): Hono<AppEnv> {
  return (
    new Hono<AppEnv>()
      // Liveness: answers without touching a dependency, so a slow database
      // never gets the container killed by an orchestrator.
      .get("/", (c) => c.json(service.check()))
      .get("/ready", async (c) => {
        const report = await service.readiness();
        return c.json(report, report.status === "ready" ? 200 : 503);
      })
  );
}
