import type { ConnectionOptions } from "bullmq";

const defaultConcurrency = 5;
const defaultPrefix = "linonward";

export type WorkerConfig = {
  concurrency: number;
  connection: ConnectionOptions;
  databaseUrl: string;
  prefix: string;
  redisUrl: string;
};

export function loadWorkerConfig(environment: Record<string, string | undefined>): WorkerConfig {
  const redisUrl = readRedisUrl(environment.REDIS_URL);

  return {
    concurrency: readConcurrency(environment.WORKER_CONCURRENCY),
    connection: connectionFromUrl(redisUrl),
    databaseUrl: readDatabaseUrl(environment.DATABASE_URL),
    prefix: readPrefix(environment.QUEUE_PREFIX),
    redisUrl,
  };
}

function readDatabaseUrl(value: string | undefined): string {
  if (!value?.trim()) throw new Error("DATABASE_URL is required");

  const url = new URL(value);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use postgres or postgresql");
  }
  return url.toString();
}

export function connectionFromUrl(value: string): ConnectionOptions {
  const url = new URL(value);
  const database = url.pathname === "/" ? 0 : Number(url.pathname.slice(1));
  if (!Number.isInteger(database) || database < 0) {
    throw new Error("REDIS_URL database must be a non-negative integer");
  }

  return {
    db: database,
    host: url.hostname,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    port: url.port ? Number(url.port) : url.protocol === "rediss:" ? 6380 : 6379,
    tls: url.protocol === "rediss:" ? {} : undefined,
    username: url.username ? decodeURIComponent(url.username) : undefined,
  };
}

function readRedisUrl(value: string | undefined): string {
  if (!value?.trim()) throw new Error("REDIS_URL is required");

  const url = new URL(value);
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
    throw new Error("REDIS_URL must use redis or rediss");
  }
  return url.toString();
}

function readConcurrency(value: string | undefined): number {
  if (!value?.trim()) return defaultConcurrency;
  const concurrency = Number(value);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 100) {
    throw new Error("WORKER_CONCURRENCY must be an integer between 1 and 100");
  }
  return concurrency;
}

function readPrefix(value: string | undefined): string {
  const prefix = value?.trim() || defaultPrefix;
  if (!/^[a-zA-Z0-9_-]+$/.test(prefix)) {
    throw new Error("QUEUE_PREFIX may contain only letters, numbers, underscores, and hyphens");
  }
  return prefix;
}
