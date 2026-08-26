import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import { type ApiModule, type AppEnv, mountModules } from "./module.js";

function moduleNamed(name: string, basePath: string): ApiModule {
  return {
    name,
    basePath,
    routes: new Hono<AppEnv>().get("/ping", (c) => c.text(name)),
  };
}

describe("mountModules", () => {
  it("serves each module under its own base path", async () => {
    const app = mountModules(new Hono<AppEnv>(), [
      moduleNamed("health", "/health"),
      moduleNamed("contact", "/contact"),
    ]);

    await expect((await app.request("/health/ping")).text()).resolves.toBe("health");
    await expect((await app.request("/contact/ping")).text()).resolves.toBe("contact");
  });

  it("refuses two modules claiming one base path instead of silently shadowing one", () => {
    expect(() =>
      mountModules(new Hono<AppEnv>(), [
        moduleNamed("contact", "/contact"),
        moduleNamed("sales", "/contact"),
      ]),
    ).toThrow('Modules "contact" and "sales" both claim the base path /contact');
  });

  it("rejects a base path that is not rooted, which would mount the module nowhere", () => {
    expect(() => mountModules(new Hono<AppEnv>(), [moduleNamed("contact", "contact")])).toThrow(
      'Module "contact" must declare a base path starting with /',
    );
  });

  it("rejects a trailing slash, which Hono would resolve to a different route", () => {
    expect(() => mountModules(new Hono<AppEnv>(), [moduleNamed("contact", "/contact/")])).toThrow(
      'Module "contact" must declare a base path without a trailing slash',
    );
  });
});
