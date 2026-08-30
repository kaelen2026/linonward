import type { ApiModule } from "../../shared/module.js";
import { type ContentRouteDependencies, createContentRoutes } from "./routes.js";

/** Content publishing and its protected editorial lifecycle. */
export function createContentModule(dependencies: ContentRouteDependencies): ApiModule {
  return {
    name: "content",
    basePath: "/api/content",
    routes: createContentRoutes(dependencies),
  };
}
