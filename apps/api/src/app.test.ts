import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp } from "./app.js";
import { ApiError } from "./shared/api-error.js";
import type { ApiModule, AppEnv } from "./shared/module.js";

const failing: ApiModule = {
  name: "failing",
  basePath: "/failing",
  routes: new Hono<AppEnv>()
    .get("/known", () => {
      throw new ApiError(409, "already_answered", "That inquiry was already answered");
    })
    .get("/unknown", () => {
      throw new Error("connection to postgres://user:hunter2@db refused");
    })
    .get("/ok", (c) => c.json({ ok: true })),
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createApp", () => {
  it("answers an unrouted path with the same error envelope as every other failure", async () => {
    const response = await createApp({ modules: [], allowedOrigins: [] }).request("/nope");

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: { code: "not_found", message: "No route matches GET /nope" },
    });
  });

  it("reports a deliberate ApiError with its own status and code", async () => {
    const response = await createApp({ modules: [failing], allowedOrigins: [] }).request(
      "/failing/known",
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: "already_answered", message: "That inquiry was already answered" },
    });
  });

  it("hides an unexpected failure behind a generic 500 rather than leaking its message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await createApp({ modules: [failing], allowedOrigins: [] }).request(
      "/failing/unknown",
    );

    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("hunter2");
  });

  it("logs the unexpected failure so a 500 is still diagnosable", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await createApp({ modules: [failing], allowedOrigins: [] }).request("/failing/unknown");

    expect(logged).toHaveBeenCalledOnce();
  });

  it("stamps every response with the request id quoted in the error envelope", async () => {
    const response = await createApp({ modules: [failing], allowedOrigins: [] }).request(
      "/failing/known",
    );
    const body = (await response.json()) as { error: { requestId: string } };

    expect(response.headers.get("x-request-id")).toBe(body.error.requestId);
    expect(body.error.requestId).not.toBe("");
  });

  it("lets a configured browser origin read the response", async () => {
    const response = await createApp({
      modules: [failing],
      allowedOrigins: ["https://linonward.com"],
    }).request("/failing/ok", { headers: { Origin: "https://linonward.com" } });

    expect(response.headers.get("access-control-allow-origin")).toBe("https://linonward.com");
  });

  it("withholds the CORS grant from an origin that is not configured", async () => {
    const response = await createApp({
      modules: [failing],
      allowedOrigins: ["https://linonward.com"],
    }).request("/failing/ok", { headers: { Origin: "https://evil.example" } });

    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("publishes its machine-readable contract and low-cardinality request metric", async () => {
    const app = createApp({ modules: [], allowedOrigins: [] });

    const contract = await app.request("/openapi.json");
    expect(contract.status).toBe(200);
    expect(await contract.json()).toMatchObject({ openapi: "3.1.0", paths: { "/health": {} } });

    await app.request("/health");
    const metrics = await app.request("/metrics");
    expect(await metrics.text()).toContain(
      'linonward_http_requests_total{method="GET",path="/health",status="404"} 1',
    );
  });
});
