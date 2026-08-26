import { describe, expect, it } from "vitest";

import { createRedisRateLimiter, type RedisClient } from "./redis.js";

/** Just enough Redis to exercise the limiter's one-command transaction. */
function fakeRedis() {
  const counters = new Map<string, number>();
  const calls: { arguments: string[]; keys: string[] }[] = [];

  const client: RedisClient = {
    eval(_script, options) {
      calls.push(options);
      const key = options.keys[0];
      if (!key) throw new Error("The script needs a counter key");
      const next = (counters.get(key) ?? 0) + 1;
      counters.set(key, next);
      return Promise.resolve([next, 42]);
    },
    ping: () => Promise.resolve("PONG"),
  };

  return { calls, client };
}

const options = { limit: 2, windowSeconds: 60 };

describe("createRedisRateLimiter", () => {
  it("namespaces its counters so they cannot collide with other keys", async () => {
    const { calls, client } = fakeRedis();
    await createRedisRateLimiter(client, options).consume("1.2.3.4");

    expect(calls[0]?.keys).toEqual(["ratelimit:1.2.3.4"]);
  });

  it("uses one atomic script for every decision", async () => {
    const { calls, client } = fakeRedis();
    const limiter = createRedisRateLimiter(client, options);

    await limiter.consume("a");
    await limiter.consume("a");

    expect(calls).toHaveLength(2);
    expect(calls[0]?.arguments).toEqual(["60"]);
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

  it("does not turn a final-second TTL into a fresh window", async () => {
    const client: RedisClient = {
      eval: () => Promise.resolve([3, 0]),
      ping: () => Promise.resolve("PONG"),
    };

    await expect(createRedisRateLimiter(client, options).consume("a")).resolves.toMatchObject({
      allowed: false,
      retryAfterSeconds: 1,
    });
  });

  it("rejects an invalid script reply instead of making a permissive decision", async () => {
    const client: RedisClient = {
      eval: () => Promise.resolve([1]),
      ping: () => Promise.resolve("PONG"),
    };

    await expect(createRedisRateLimiter(client, options).consume("a")).rejects.toThrow(
      "Redis rate-limit script returned an invalid result",
    );
  });
});
