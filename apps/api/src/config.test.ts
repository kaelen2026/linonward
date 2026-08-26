import { describe, expect, it } from "vitest";

import { loadApiConfig } from "./config.js";

describe("loadApiConfig", () => {
  it("serves on port 3001 so it does not collide with the website", () => {
    expect(loadApiConfig({})).toMatchObject({
      allowedOrigins: [],
      host: "0.0.0.0",
      port: 3001,
      version: "0.0.0",
    });
  });

  it("reads the port and version the deployment assigns", () => {
    expect(loadApiConfig({ API_VERSION: "1.4.0", PORT: "8080" })).toMatchObject({
      port: 8080,
      version: "1.4.0",
    });
  });

  it("rejects a port outside the range a socket can bind", () => {
    expect(() => loadApiConfig({ PORT: "70000" })).toThrow(
      "PORT must be an integer between 1 and 65535",
    );
  });

  it("splits the browser origins allowed to call the API", () => {
    expect(
      loadApiConfig({ CORS_ALLOWED_ORIGINS: "https://linonward.com, http://localhost:3000 , " }),
    ).toMatchObject({
      allowedOrigins: ["https://linonward.com", "http://localhost:3000"],
    });
  });

  it("rejects an allowed origin carrying a path, which no browser ever sends", () => {
    expect(() => loadApiConfig({ CORS_ALLOWED_ORIGINS: "https://linonward.com/zh" })).toThrow(
      "CORS_ALLOWED_ORIGINS must list bare http(s) origins",
    );
  });

  it("accepts only literal addresses as trusted proxies", () => {
    expect(loadApiConfig({ TRUSTED_PROXY_IPS: "127.0.0.1, 10.0.0.4" })).toMatchObject({
      trustedProxyIps: ["127.0.0.1", "10.0.0.4"],
    });
    expect(() => loadApiConfig({ TRUSTED_PROXY_IPS: "proxy.internal" })).toThrow(
      "TRUSTED_PROXY_IPS must list IP addresses",
    );
  });
});

describe("loadApiConfig infrastructure", () => {
  it("leaves the database and cache unset so local dev needs no containers", () => {
    expect(loadApiConfig({})).toMatchObject({
      databaseUrl: undefined,
      redisUrl: undefined,
      inquiryRateLimit: { limit: 5, windowSeconds: 3_600 },
    });
  });

  it("accepts the connection strings the deployment provides", () => {
    expect(
      loadApiConfig({
        DATABASE_URL: "postgres://user:pw@db:5432/linonward",
        REDIS_URL: "rediss://cache:6380",
      }),
    ).toMatchObject({
      databaseUrl: "postgres://user:pw@db:5432/linonward",
      redisUrl: "rediss://cache:6380",
    });
  });

  it("rejects a database URL for a protocol the driver cannot speak", () => {
    expect(() => loadApiConfig({ DATABASE_URL: "mysql://db:3306/linonward" })).toThrow(
      "DATABASE_URL must be a valid postgres:// URL",
    );
  });

  it("refuses to start in production without durable storage", () => {
    expect(() =>
      loadApiConfig({ NODE_ENV: "production", REDIS_URL: "redis://cache:6379" }),
    ).toThrow("DATABASE_URL is required when NODE_ENV=production");
  });

  it("refuses to start in production with per-process rate limiting", () => {
    expect(() =>
      loadApiConfig({ NODE_ENV: "production", DATABASE_URL: "postgres://db:5432/linonward" }),
    ).toThrow("REDIS_URL is required when NODE_ENV=production");
  });

  it("reads a tightened submission budget", () => {
    expect(
      loadApiConfig({ INQUIRY_RATE_LIMIT: "2", INQUIRY_RATE_WINDOW_SECONDS: "60" }),
    ).toMatchObject({ inquiryRateLimit: { limit: 2, windowSeconds: 60 } });
  });

  it("rejects a rate limit of zero, which would refuse every submission", () => {
    expect(() => loadApiConfig({ INQUIRY_RATE_LIMIT: "0" })).toThrow(
      "INQUIRY_RATE_LIMIT must be a positive integer",
    );
  });
});
