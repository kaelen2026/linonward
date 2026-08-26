import { describe, expect, it } from "vitest";

import { createApiApp, createApiModules, createDefaultDependencies } from "./composition.js";
import { loadApiConfig } from "./config.js";

const config = loadApiConfig({ API_VERSION: "1.4.0" });

describe("createApiModules", () => {
  it("mounts the modules the API ships, each on its own base path", async () => {
    const modules = createApiModules(await createDefaultDependencies(config));

    expect(modules.map((module) => [module.name, module.basePath])).toEqual([
      ["health", "/health"],
      ["contact", "/contact"],
    ]);
  });
});

describe("createDefaultDependencies", () => {
  it("starts with nothing to probe when no infrastructure is configured", async () => {
    // The in-memory adapters have nothing to be unreachable, so a local run
    // reports ready rather than degraded.
    expect(Object.keys((await createDefaultDependencies(config)).probes)).toEqual([]);
  });
});

describe("createApiApp", () => {
  it("serves the health check with the configured version", async () => {
    const app = createApiApp(config, await createDefaultDependencies(config));

    const response = await app.request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", version: "1.4.0" });
  });
});
