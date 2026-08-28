import { describe, expect, it, vi } from "vitest";

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

  it("closes Postgres when Redis fails during startup", async () => {
    const closePostgres = vi.fn(() => Promise.resolve());
    const infrastructureConfig = loadApiConfig({
      DATABASE_URL: "postgres://localhost/linonward",
      REDIS_URL: "redis://localhost:6379",
    });

    await expect(
      createDefaultDependencies(infrastructureConfig, {
        connectDatabase: () => ({
          db: {} as never,
          sql: {} as never,
          ping: () => Promise.resolve(),
          close: closePostgres,
        }),
        connectRedis: () => Promise.reject(new Error("Redis unavailable")),
      }),
    ).rejects.toThrow("Redis unavailable");

    expect(closePostgres).toHaveBeenCalledOnce();
  });

  it("attempts every resource close when one close fails", async () => {
    const closePostgres = vi.fn(() => Promise.reject(new Error("Postgres close failed")));
    const closeRedis = vi.fn(() => Promise.resolve());
    const infrastructureConfig = loadApiConfig({
      DATABASE_URL: "postgres://localhost/linonward",
      REDIS_URL: "redis://localhost:6379",
    });
    const dependencies = await createDefaultDependencies(infrastructureConfig, {
      connectDatabase: () => ({
        db: {} as never,
        sql: {} as never,
        ping: () => Promise.resolve(),
        close: closePostgres,
      }),
      connectRedis: () =>
        Promise.resolve({
          eval: () => Promise.resolve([1, 60]),
          ping: () => Promise.resolve("PONG"),
          close: closeRedis,
        }),
    });

    await expect(dependencies.close()).rejects.toThrow("Postgres close failed");
    expect(closeRedis).toHaveBeenCalledOnce();
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
