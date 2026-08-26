import { randomUUID } from "node:crypto";
import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context, Hono } from "hono";

import { createApp } from "./app.js";
import type { ApiConfig } from "./config.js";
import { createContactModule } from "./modules/contact/index.js";
import { createPostgresInquiryRepository } from "./modules/contact/postgres-repository.js";
import {
  createInMemoryInquiryRepository,
  type InquiryRepository,
} from "./modules/contact/repository.js";
import { createHealthModule } from "./modules/health/index.js";
import type { DependencyProbes } from "./modules/health/service.js";
import type { ApiModule, AppEnv } from "./shared/module.js";
import { connectPostgres, type PostgresConnection } from "./shared/postgres.js";
import { createInMemoryRateLimiter, type RateLimiter, rateLimit } from "./shared/rate-limit.js";
import { connectRedis, createRedisRateLimiter, type RedisConnection } from "./shared/redis.js";

/**
 * Everything the modules need from the outside world, in one place. Time, ids,
 * storage, and counting are injected rather than reached for, which is what
 * makes a module testable without a server or a database.
 */
export type ApiDependencies = {
  version: string;
  startedAt: Date;
  clock: () => Date;
  nextId: () => string;
  inquiries: InquiryRepository;
  inquiryRateLimiter: RateLimiter;
  probes: DependencyProbes;
  /** Closed on shutdown; empty when everything is in-memory. */
  close: () => Promise<void>;
};

/**
 * Picks the real adapters. This is the only function that knows Postgres and
 * Redis exist — swapping either one is a change here and in its adapter file.
 */
export async function createDefaultDependencies(config: ApiConfig): Promise<ApiDependencies> {
  const clock = () => new Date();
  const probes: DependencyProbes = {};
  const closers: (() => Promise<void>)[] = [];

  let postgres: PostgresConnection | undefined;
  if (config.databaseUrl) {
    postgres = connectPostgres(config.databaseUrl);
    probes.postgres = () => postgres?.ping() ?? Promise.resolve();
    closers.push(() => postgres?.close() ?? Promise.resolve());
  }

  let redis: RedisConnection | undefined;
  if (config.redisUrl) {
    redis = await connectRedis(config.redisUrl);
    probes.redis = async () => {
      await redis?.ping();
    };
    closers.push(() => redis?.close() ?? Promise.resolve());
  }

  return {
    version: config.version,
    startedAt: clock(),
    clock,
    nextId: () => `inq_${randomUUID()}`,
    inquiries: postgres
      ? createPostgresInquiryRepository(postgres.sql)
      : createInMemoryInquiryRepository(),
    inquiryRateLimiter: redis
      ? createRedisRateLimiter(redis, config.inquiryRateLimit)
      : createInMemoryRateLimiter(config.inquiryRateLimit, clock),
    probes,
    close: async () => {
      for (const closer of closers) {
        await closer();
      }
    },
  };
}

/**
 * The proxy hop is trusted because the API is only ever exposed through one.
 * Reached for here rather than in `shared/`, since it is the composition root
 * that knows the app runs on Node behind a reverse proxy.
 */
function clientKey(c: Context<AppEnv>): string {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || getConnInfo(c).remote.address || "unknown";
}

/** The mount table. Adding a module to the monolith means adding a line here. */
export function createApiModules(dependencies: ApiDependencies): ApiModule[] {
  return [
    createHealthModule({
      version: dependencies.version,
      startedAt: dependencies.startedAt,
      clock: dependencies.clock,
      probes: dependencies.probes,
    }),
    createContactModule({
      repository: dependencies.inquiries,
      clock: dependencies.clock,
      nextId: dependencies.nextId,
      throttle: rateLimit(dependencies.inquiryRateLimiter, clientKey),
    }),
  ];
}

export function createApiApp(config: ApiConfig, dependencies: ApiDependencies): Hono<AppEnv> {
  return createApp({
    modules: createApiModules(dependencies),
    allowedOrigins: config.allowedOrigins,
  });
}
