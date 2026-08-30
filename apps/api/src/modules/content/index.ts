import type { ApiModule } from "../../shared/module.js";
import { createContentRoutes } from "./routes.js";
import { type ContentServiceDependencies, createContentService } from "./service.js";

/** Content publishing and its protected editorial lifecycle. */
export function createContentModule(dependencies: ContentServiceDependencies): ApiModule {
  return {
    name: "content",
    basePath: "/api/content",
    routes: createContentRoutes(createContentService(dependencies)),
  };
}
