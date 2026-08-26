import type { ApiModule } from "../../shared/module.js";
import { createHealthRoutes } from "./routes.js";
import { createHealthService, type HealthServiceDependencies } from "./service.js";

export type HealthModuleDependencies = HealthServiceDependencies;

/** Liveness and build identity. The only module with no state of its own. */
export function createHealthModule(dependencies: HealthModuleDependencies): ApiModule {
  return {
    name: "health",
    basePath: "/health",
    routes: createHealthRoutes(createHealthService(dependencies)),
  };
}
