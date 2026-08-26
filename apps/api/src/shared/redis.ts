import { createClient } from "redis";

import type { RateLimiter, RateLimitOptions } from "./rate-limit.js";

/**
 * The slice of Redis this app actually uses. Depending on four commands rather
 * than the whole client is what lets the limiter below be tested with a fake.
 */
export type RedisClient = {
  eval(script: string, options: { arguments: string[]; keys: string[] }): Promise<unknown>;
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
    eval: (script, options) => client.eval(script, options),
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
      const result = await client.eval(
        [
          "local count = redis.call('INCR', KEYS[1])",
          "local ttl = redis.call('TTL', KEYS[1])",
          "if count == 1 or ttl == -1 then",
          "  redis.call('EXPIRE', KEYS[1], ARGV[1])",
          "  ttl = redis.call('TTL', KEYS[1])",
          "end",
          "return { count, ttl }",
        ].join("\n"),
        { arguments: [String(windowSeconds)], keys: [counter] },
      );
      const [count, ttl] = readCounterResult(result);

      return {
        allowed: count <= limit,
        limit,
        remaining: Math.max(0, limit - count),
        retryAfterSeconds: ttl > 0 ? ttl : 1,
      };
    },
  };
}

function readCounterResult(result: unknown): [number, number] {
  if (
    !Array.isArray(result) ||
    result.length !== 2 ||
    !result.every((value) => typeof value === "number")
  ) {
    throw new Error("Redis rate-limit script returned an invalid result");
  }
  return [result[0]!, result[1]!];
}
