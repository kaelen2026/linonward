const defaultPort = 3001;
const defaultVersion = "0.0.0";
const defaultRateLimit = 5;
const defaultRateWindowSeconds = 3_600;

export type ApiConfig = {
  /** Browser origins allowed to call the API. Empty disables CORS entirely. */
  allowedOrigins: readonly string[];
  /** Absent falls back to in-memory storage, which is refused in production. */
  databaseUrl: string | undefined;
  host: string;
  inquiryRateLimit: { limit: number; windowSeconds: number };
  port: number;
  /** Absent falls back to a per-process limiter, which is refused in production. */
  redisUrl: string | undefined;
  /** Reported by `GET /health`, so a running deploy can be identified. */
  version: string;
};

export function loadApiConfig(environment: Record<string, string | undefined>): ApiConfig {
  const databaseUrl = readUrl(environment.DATABASE_URL, "DATABASE_URL", [
    "postgres:",
    "postgresql:",
  ]);
  const redisUrl = readUrl(environment.REDIS_URL, "REDIS_URL", ["redis:", "rediss:"]);

  // In-memory storage loses every inquiry on restart and an in-process limiter
  // hands each replica its own budget. Both are fine locally and neither is
  // something to discover in production from a support ticket.
  if (environment.NODE_ENV === "production") {
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required when NODE_ENV=production");
    }
    if (!redisUrl) {
      throw new Error("REDIS_URL is required when NODE_ENV=production");
    }
  }

  return {
    allowedOrigins: readAllowedOrigins(environment.CORS_ALLOWED_ORIGINS),
    databaseUrl,
    host: environment.HOST?.trim() || "0.0.0.0",
    inquiryRateLimit: {
      limit: readCount(environment.INQUIRY_RATE_LIMIT, "INQUIRY_RATE_LIMIT", defaultRateLimit),
      windowSeconds: readCount(
        environment.INQUIRY_RATE_WINDOW_SECONDS,
        "INQUIRY_RATE_WINDOW_SECONDS",
        defaultRateWindowSeconds,
      ),
    },
    port: readPort(environment.PORT),
    redisUrl,
    version: environment.API_VERSION?.trim() || defaultVersion,
  };
}

function readAllowedOrigins(value: string | undefined): readonly string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(readOrigin);
}

function readOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("CORS_ALLOWED_ORIGINS must list bare http(s) origins");
  }
  // An `Origin` header carries scheme, host, and port and nothing else, so an
  // entry with a path or a trailing slash could never match a real request.
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.origin !== value) {
    throw new Error("CORS_ALLOWED_ORIGINS must list bare http(s) origins");
  }
  return url.origin;
}

function readCount(value: string | undefined, name: string, fallback: number): number {
  if (!value?.trim()) {
    return fallback;
  }
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return count;
}

function readPort(value: string | undefined): number {
  if (!value?.trim()) {
    return defaultPort;
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
}

function readUrl(
  value: string | undefined,
  name: string,
  protocols: readonly string[],
): string | undefined {
  const url = value?.trim();
  if (!url) {
    return undefined;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${name} must be a valid ${protocols[0]}// URL`);
  }
  if (!protocols.includes(parsed.protocol)) {
    throw new Error(`${name} must be a valid ${protocols[0]}// URL`);
  }
  return url;
}
