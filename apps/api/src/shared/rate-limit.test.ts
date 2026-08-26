import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import type { AppEnv } from "./module.js";
import { createInMemoryRateLimiter, rateLimit } from "./rate-limit.js";

const options = { limit: 2, windowSeconds: 60 };

function movableClock(start: string) {
  let now = new Date(start).getTime();
  return {
    clock: () => new Date(now),
    advanceSeconds: (seconds: number) => {
      now += seconds * 1000;
    },
  };
}

describe("createInMemoryRateLimiter", () => {
  it("allows requests up to the limit and refuses the one after", async () => {
    const limiter = createInMemoryRateLimiter(options, movableClock("2026-08-26T07:00:00Z").clock);

    await expect(limiter.consume("a")).resolves.toMatchObject({ allowed: true, remaining: 1 });
    await expect(limiter.consume("a")).resolves.toMatchObject({ allowed: true, remaining: 0 });
    await expect(limiter.consume("a")).resolves.toMatchObject({ allowed: false, remaining: 0 });
  });

  it("gives each key its own budget", async () => {
    const limiter = createInMemoryRateLimiter(options, movableClock("2026-08-26T07:00:00Z").clock);
    await limiter.consume("a");
    await limiter.consume("a");

    await expect(limiter.consume("b")).resolves.toMatchObject({ allowed: true });
  });

  it("opens a fresh budget once the window has passed", async () => {
    const time = movableClock("2026-08-26T07:00:00Z");
    const limiter = createInMemoryRateLimiter(options, time.clock);
    await limiter.consume("a");
    await limiter.consume("a");
    await expect(limiter.consume("a")).resolves.toMatchObject({ allowed: false });

    time.advanceSeconds(61);

    await expect(limiter.consume("a")).resolves.toMatchObject({ allowed: true, remaining: 1 });
  });

  it("counts down the seconds left rather than restating the window", async () => {
    const time = movableClock("2026-08-26T07:00:00Z");
    const limiter = createInMemoryRateLimiter(options, time.clock);
    await limiter.consume("a");
    time.advanceSeconds(20);

    await expect(limiter.consume("a")).resolves.toMatchObject({ retryAfterSeconds: 40 });
  });
});

describe("rateLimit", () => {
  function appLimitedTo(limit: number) {
    const time = movableClock("2026-08-26T07:00:00Z");
    const throttle = rateLimit(
      createInMemoryRateLimiter({ limit, windowSeconds: 60 }, time.clock),
      (c) => c.req.header("x-client") ?? "anonymous",
    );

    return createApp({
      allowedOrigins: [],
      modules: [
        {
          name: "guarded",
          basePath: "/guarded",
          routes: new Hono<AppEnv>().use("*", throttle).get("/", (c) => c.json({ ok: true })),
        },
      ],
    });
  }

  it("reports the remaining budget on a request it let through", async () => {
    const response = await appLimitedTo(3).request("/guarded");

    expect(response.status).toBe(200);
    expect(response.headers.get("x-ratelimit-limit")).toBe("3");
    expect(response.headers.get("x-ratelimit-remaining")).toBe("2");
  });

  it("refuses an over-budget client with 429 and the shared error envelope", async () => {
    const app = appLimitedTo(1);
    await app.request("/guarded");

    const response = await app.request("/guarded");

    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ error: { code: "rate_limited" } });
  });

  it("tells the refused client when to come back", async () => {
    const app = appLimitedTo(1);
    await app.request("/guarded");

    const response = await app.request("/guarded");

    expect(response.headers.get("retry-after")).toBe("60");
  });

  it("charges each client separately", async () => {
    const app = appLimitedTo(1);
    await app.request("/guarded", { headers: { "x-client": "first" } });

    const response = await app.request("/guarded", { headers: { "x-client": "second" } });

    expect(response.status).toBe(200);
  });
});
