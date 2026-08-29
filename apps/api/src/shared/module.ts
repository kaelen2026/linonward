import type { Hono } from "hono";
import type { RequestIdVariables } from "hono/request-id";

import type { TraceContext } from "./telemetry.js";

/**
 * The context every module can rely on. Keeping it in the shared kernel is what
 * lets a module read `c.var.requestId` without knowing how the root app is built.
 */
export type AppEnv = {
  Variables: RequestIdVariables & { trace: TraceContext };
};

/**
 * Everything the composition root is allowed to know about a module.
 *
 * A module owns its routes, its domain logic, and its storage port. It reaches
 * outside itself only for `src/shared`, never for another module's internals —
 * `src/modules/boundaries.test.ts` enforces that mechanically.
 */
export type ApiModule = {
  /** Used in mount errors; unique across the app. */
  name: string;
  /** Where the composition root mounts the module, e.g. `/contact`. */
  basePath: string;
  routes: Hono<AppEnv>;
};

/**
 * Mounts every module and fails loudly on a collision. Hono resolves duplicate
 * base paths by first match, so without this the second module's routes would
 * be unreachable with nothing to indicate why.
 */
export function mountModules(app: Hono<AppEnv>, modules: readonly ApiModule[]): Hono<AppEnv> {
  const claimed = new Map<string, string>();

  for (const module of modules) {
    if (!module.basePath.startsWith("/")) {
      throw new Error(`Module "${module.name}" must declare a base path starting with /`);
    }
    if (module.basePath.length > 1 && module.basePath.endsWith("/")) {
      throw new Error(`Module "${module.name}" must declare a base path without a trailing slash`);
    }

    const owner = claimed.get(module.basePath);
    if (owner) {
      throw new Error(
        `Modules "${owner}" and "${module.name}" both claim the base path ${module.basePath}`,
      );
    }

    claimed.set(module.basePath, module.name);
    app.route(module.basePath, module.routes);
  }

  return app;
}
