import { createClient } from "redis";

import type { RateLimiter, RateLimitOptions } from "./rate-limit.js";

/**
 * The slice of Redis this app actually uses. Depending on four commands rather
 * than the whole client is what lets the limiter below be tested with a fake.
 */
export type RedisClient = {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<boolean | number>;
  ttl(key: string): Promise<number>;
  ping(): Promise<string>;
};

export type RedisConnection = RedisClient & {
  close(): Promise<void>;
};

export async function connectRedis(url: string): Promise<RedisConnection> {
  const client = createClient({ url });
  // Without a listener, a dropped connection would crash the process; node-redis
  // reconnects on its own, so logging is the whole job here.
  client.on("error", (error: unknown) => console.error("Redis client error", error));
  await client.connect();

  return {
    incr: (key) => client.incr(key),
    expire: (key, seconds) => client.expire(key, seconds),
    ttl: (key) => client.ttl(key),
    ping: () => client.ping(),
    close: async () => {
      await client.close();
    },
  };
}

/** Shared counting, so every replica draws from one budget. */
export function createRedisRateLimiter(
  client: RedisClient,
  { limit, windowSeconds }: RateLimitOptions,
): RateLimiter {
  return {
    async consume(key) {
      const counter = `ratelimit:${key}`;
      const count = await client.incr(counter);

      // Only the hit that opened the window sets the expiry. Refreshing it on
      // every hit would let a steady stream hold the window open forever.
      if (count === 1) {
        await client.expire(counter, windowSeconds);
      }

      const ttl = await client.ttl(counter);

      return {
        allowed: count <= limit,
        limit,
        remaining: Math.max(0, limit - count),
        retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
      };
    },
  };
}
