import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { connectRedis, createRedisRateLimiter, type RedisConnection } from "./redis.js";

const redisUrl = process.env.REDIS_URL;

describe.skipIf(!redisUrl)("Redis rate limiter integration", () => {
  let redis: RedisConnection;

  beforeAll(async () => {
    redis = await connectRedis(redisUrl ?? "");
  });

  afterAll(async () => {
    await redis.close();
  });

  it("shares one atomic request budget across concurrent consumers", async () => {
    const limiter = createRedisRateLimiter(redis, { limit: 2, windowSeconds: 60 });
    const key = `integration:${randomUUID()}`;

    const decisions = await Promise.all([
      limiter.consume(key),
      limiter.consume(key),
      limiter.consume(key),
    ]);

    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(2);
    expect(decisions.filter((decision) => !decision.allowed)).toHaveLength(1);
    expect(decisions.every((decision) => decision.retryAfterSeconds > 0)).toBe(true);
  });
});
