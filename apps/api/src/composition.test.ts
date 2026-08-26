import { describe, expect, it } from "vitest";

import { createApiApp, createApiModules, createDefaultDependencies } from "./composition.js";
import { loadApiConfig } from "./config.js";

const config = loadApiConfig({ API_VERSION: "1.4.0" });

describe("createApiModules", () => {
  it("mounts the modules the API ships, each on its own base path", () => {
    const modules = createApiModules(createDefaultDependencies(config));

    expect(modules.map((module) => [module.name, module.basePath])).toEqual([
      ["health", "/health"],
      ["contact", "/contact"],
    ]);
  });
});

describe("createApiApp", () => {
  it("serves the health check with the configured version", async () => {
    const response = await createApiApp(config).request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", version: "1.4.0" });
  });
});
