import { randomUUID } from "node:crypto";
import { getConnInfo } from "@hono/node-server/conninfo";
import { connectDatabase, type DatabaseConnection } from "@linonward/db";
import type { Context, Hono } from "hono";
import { Resend } from "resend";

import { createApp } from "./app.js";
import type { ApiConfig } from "./config.js";
import { createAuthRuntime } from "./modules/auth/auth.js";
import { type AuthRuntime, createAuthModule } from "./modules/auth/index.js";
import { createContactModule } from "./modules/contact/index.js";
import { createPostgresInquiryRepository } from "./modules/contact/postgres-repository.js";
import {
  createInMemoryInquiryRepository,
  type InquiryRepository,
} from "./modules/contact/repository.js";
import { createContentModule } from "./modules/content/index.js";
import { createHealthModule } from "./modules/health/index.js";
import type { DependencyProbes } from "./modules/health/service.js";
import { clientIp } from "./shared/client-ip.js";
import type { ApiModule, AppEnv } from "./shared/module.js";
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
  auth?: AuthRuntime;
  contentDatabase?: DatabaseConnection["db"];
  administratorEmails?: readonly string[];
  trustedProxyIps: readonly string[];
  /** Closed on shutdown; empty when everything is in-memory. */
  close: () => Promise<void>;
};

type InfrastructureFactories = {
  connectDatabase: typeof connectDatabase;
  connectRedis: typeof connectRedis;
};

const defaultInfrastructureFactories: InfrastructureFactories = { connectDatabase, connectRedis };

async function closeResources(closers: readonly (() => Promise<void>)[]): Promise<void> {
  const results = await Promise.allSettled(closers.map((close) => close()));
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (failure) {
    throw failure.reason;
  }
}

/**
 * Picks the real adapters. This is the only function that knows Postgres and
 * Redis exist — swapping either one is a change here and in its adapter file.
 */
export async function createDefaultDependencies(
  config: ApiConfig,
  factories: InfrastructureFactories = defaultInfrastructureFactories,
): Promise<ApiDependencies> {
  const clock = () => new Date();
  const probes: DependencyProbes = {};
  const closers: (() => Promise<void>)[] = [];

  let postgres: DatabaseConnection | undefined;
  let redis: RedisConnection | undefined;
  try {
    if (config.databaseUrl) {
      postgres = factories.connectDatabase(config.databaseUrl);
      probes.postgres = () => postgres?.ping() ?? Promise.resolve();
      closers.push(() => postgres?.close() ?? Promise.resolve());
    }

    if (config.redisUrl) {
      redis = await factories.connectRedis(config.redisUrl);
      probes.redis = async () => {
        await redis?.ping();
      };
      closers.push(() => redis?.close() ?? Promise.resolve());
    }
  } catch (startupError) {
    try {
      await closeResources(closers);
    } catch (cleanupError) {
      throw new AggregateError(
        [startupError, cleanupError],
        "API startup failed and initialized resources could not be closed",
      );
    }
    throw startupError;
  }

  return {
    version: config.version,
    startedAt: clock(),
    clock,
    nextId: () => `inq_${randomUUID()}`,
    inquiries: postgres
      ? createPostgresInquiryRepository(postgres.db)
      : createInMemoryInquiryRepository(),
    inquiryRateLimiter: redis
      ? createRedisRateLimiter(redis, config.inquiryRateLimit)
      : createInMemoryRateLimiter(config.inquiryRateLimit, clock),
    auth:
      postgres && config.auth
        ? createAuthRuntime(config.auth, postgres.db, new Resend(config.auth.resendApiKey))
        : undefined,
    contentDatabase: postgres?.db,
    administratorEmails: config.administratorEmails,
    probes,
    trustedProxyIps: config.trustedProxyIps,
    close: () => closeResources(closers),
  };
}

/**
 * The composition root knows the socket peer and deployment's trusted proxy
 * list. The policy itself lives in `shared` so it can be verified in isolation.
 */
function clientKey(c: Context<AppEnv>, trustedProxyIps: readonly string[]): string {
  return clientIp({
    forwardedFor: c.req.header("x-forwarded-for"),
    remoteAddress: getConnInfo(c).remote.address,
    trustedProxyIps,
  });
}

/** The mount table. Adding a module to the monolith means adding a line here. */
export function createApiModules(dependencies: ApiDependencies): ApiModule[] {
  const modules: ApiModule[] = [
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
      throttle: rateLimit(dependencies.inquiryRateLimiter, (c) =>
        clientKey(c, dependencies.trustedProxyIps),
      ),
    }),
  ];
  if (dependencies.contentDatabase)
    modules.push(
      createContentModule({
        database: dependencies.contentDatabase,
        authenticate: dependencies.auth?.getSession,
        administratorEmails: dependencies.administratorEmails ?? [],
        clock: dependencies.clock,
        nextId: () => `art_${randomUUID()}`,
        nextAuditId: () => `audit_${randomUUID()}`,
      }),
    );
  if (dependencies.auth) modules.push(createAuthModule({ handler: dependencies.auth.handler }));
  return modules;
}

export function createApiApp(config: ApiConfig, dependencies: ApiDependencies): Hono<AppEnv> {
  return createApp({
    modules: createApiModules(dependencies),
    allowedOrigins: config.allowedOrigins,
  });
}
