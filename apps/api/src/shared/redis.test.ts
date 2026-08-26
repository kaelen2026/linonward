import { describe, expect, it } from "vitest";

import { createRedisRateLimiter, type RedisClient } from "./redis.js";

/** Just enough Redis to exercise the limiter's command sequence. */
function fakeRedis() {
  const counters = new Map<string, number>();
  const expiries: { key: string; seconds: number }[] = [];

  const client: RedisClient = {
    incr(key) {
      const next = (counters.get(key) ?? 0) + 1;
      counters.set(key, next);
      return Promise.resolve(next);
    },
    expire(key, seconds) {
      expiries.push({ key, seconds });
      return Promise.resolve(true);
    },
    ttl: () => Promise.resolve(42),
    ping: () => Promise.resolve("PONG"),
  };

  return { client, expiries };
}

const options = { limit: 2, windowSeconds: 60 };

describe("createRedisRateLimiter", () => {
  it("namespaces its counters so they cannot collide with other keys", async () => {
    const { client, expiries } = fakeRedis();
    await createRedisRateLimiter(client, options).consume("1.2.3.4");

    expect(expiries[0]?.key).toBe("ratelimit:1.2.3.4");
  });

  it("sets the expiry only on the hit that opened the window", async () => {
    const { client, expiries } = fakeRedis();
    const limiter = createRedisRateLimiter(client, options);

    await limiter.consume("a");
    await limiter.consume("a");

    // Re-arming the expiry on every hit would let a steady stream hold the
    // window open and never reset the budget.
    expect(expiries).toHaveLength(1);
    expect(expiries[0]?.seconds).toBe(60);
  });

  it("refuses once the shared counter passes the limit", async () => {
    const { client } = fakeRedis();
    const limiter = createRedisRateLimiter(client, options);

    await limiter.consume("a");
    await limiter.consume("a");

    await expect(limiter.consume("a")).resolves.toMatchObject({ allowed: false, remaining: 0 });
  });

  it("reports the key's real time to live, not the configured window", async () => {
    const { client } = fakeRedis();

    await expect(createRedisRateLimiter(client, options).consume("a")).resolves.toMatchObject({
      retryAfterSeconds: 42,
    });
  });
});
