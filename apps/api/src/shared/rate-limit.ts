import type { Context, MiddlewareHandler } from "hono";

import { ApiError } from "./api-error.js";
import type { AppEnv } from "./module.js";

export type RateLimitOptions = {
  /** Requests allowed per window. */
  limit: number;
  windowSeconds: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the current window closes. */
  retryAfterSeconds: number;
};

/**
 * A fixed-window counter. Deliberately not a sliding window: two counters and a
 * sorted set buy smoother edges than a contact form will ever need.
 */
export type RateLimiter = {
  consume(key: string): Promise<RateLimitDecision>;
};

// Expired windows are only swept once the map is large enough to matter, so the
// common path stays a single Map lookup.
const sweepThreshold = 10_000;

/**
 * Process-local counting. Correct for one replica; two replicas each get the
 * full budget, which is why production requires the Redis limiter instead.
 */
export function createInMemoryRateLimiter(
  { limit, windowSeconds }: RateLimitOptions,
  clock: () => Date,
): RateLimiter {
  const windows = new Map<string, { count: number; expiresAt: number }>();

  return {
    consume(key) {
      const now = clock().getTime();

      if (windows.size > sweepThreshold) {
        for (const [candidate, window] of windows) {
          if (window.expiresAt <= now) {
            windows.delete(candidate);
          }
        }
      }

      const open = windows.get(key);
      const window =
        open && open.expiresAt > now ? open : { count: 0, expiresAt: now + windowSeconds * 1000 };

      window.count += 1;
      windows.set(key, window);

      return Promise.resolve({
        allowed: window.count <= limit,
        limit,
        remaining: Math.max(0, limit - window.count),
        retryAfterSeconds: Math.max(1, Math.ceil((window.expiresAt - now) / 1000)),
      });
    },
  };
}

/**
 * Counts through the limiter and refuses the request when the budget is spent.
 * The key is supplied by the caller so this file never has to know whether the
 * app sits behind a proxy.
 */
export function rateLimit(
  limiter: RateLimiter,
  keyOf: (c: Context<AppEnv>) => string,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const decision = await limiter.consume(keyOf(c));

    c.header("X-RateLimit-Limit", String(decision.limit));
    c.header("X-RateLimit-Remaining", String(decision.remaining));

    if (!decision.allowed) {
      c.header("Retry-After", String(decision.retryAfterSeconds));
      throw new ApiError(429, "rate_limited", "Too many submissions; try again later");
    }

    await next();
  };
}
