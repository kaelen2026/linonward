import { describe, expect, it } from "vitest";
import { connectionFromUrl, loadWorkerConfig } from "./config.js";

describe("loadWorkerConfig", () => {
  it("uses safe defaults", () => {
    expect(
      loadWorkerConfig({
        DATABASE_URL: "postgres://worker:secret@localhost:5432/linonward",
        REDIS_URL: "redis://localhost:6379",
      }),
    ).toMatchObject({
      concurrency: 5,
      databaseUrl: "postgres://worker:secret@localhost:5432/linonward",
      prefix: "linonward",
      redisUrl: "redis://localhost:6379",
    });
  });

  it("parses credentials, database, and TLS", () => {
    expect(connectionFromUrl("rediss://worker:s%40cret@cache.example:6381/2")).toEqual({
      db: 2,
      host: "cache.example",
      password: "s@cret",
      port: 6381,
      tls: {},
      username: "worker",
    });
  });

  it.each([
    [{ DATABASE_URL: "postgres://localhost" }, "REDIS_URL is required"],
    [
      { DATABASE_URL: "postgres://localhost", REDIS_URL: "https://cache.example" },
      "REDIS_URL must use redis or rediss",
    ],
    [{ REDIS_URL: "redis://localhost" }, "DATABASE_URL is required"],
    [
      { DATABASE_URL: "mysql://localhost", REDIS_URL: "redis://localhost" },
      "DATABASE_URL must use postgres or postgresql",
    ],
    [
      {
        DATABASE_URL: "postgres://localhost",
        REDIS_URL: "redis://localhost",
        WORKER_CONCURRENCY: "0",
      },
      "WORKER_CONCURRENCY must be an integer between 1 and 100",
    ],
    [
      {
        DATABASE_URL: "postgres://localhost",
        QUEUE_PREFIX: "bad:prefix",
        REDIS_URL: "redis://localhost",
      },
      "QUEUE_PREFIX may contain only letters, numbers, underscores, and hyphens",
    ],
  ])("rejects invalid environment %#", (environment, message) => {
    expect(() => loadWorkerConfig(environment)).toThrow(message);
  });
});
