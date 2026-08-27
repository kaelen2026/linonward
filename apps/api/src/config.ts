import { isIP } from "node:net";

import type { AuthConfig } from "./shared/auth-config.js";

const defaultPort = 3001;
const defaultVersion = "0.0.0";
const defaultRateLimit = 5;
const defaultRateWindowSeconds = 3_600;

export type ApiConfig = {
  /** Browser origins allowed to call the API. Empty disables CORS entirely. */
  allowedOrigins: readonly string[];
  /** Better Auth is optional for zero-config local API work and required in production. */
  auth: AuthConfig | undefined;
  /** Absent falls back to in-memory storage, which is refused in production. */
  databaseUrl: string | undefined;
  host: string;
  inquiryRateLimit: { limit: number; windowSeconds: number };
  port: number;
  /** Absent falls back to a per-process limiter, which is refused in production. */
  redisUrl: string | undefined;
  /** Socket peers allowed to supply the client address through X-Forwarded-For. */
  trustedProxyIps: readonly string[];
  /** Reported by `GET /health`, so a running deploy can be identified. */
  version: string;
};

export function loadApiConfig(environment: Record<string, string | undefined>): ApiConfig {
  const databaseUrl = readUrl(environment.DATABASE_URL, "DATABASE_URL", [
    "postgres:",
    "postgresql:",
  ]);
  const redisUrl = readUrl(environment.REDIS_URL, "REDIS_URL", ["redis:", "rediss:"]);
  const google = readGoogleConfig(environment);

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
    requireValue(environment.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET");
    requireValue(environment.BETTER_AUTH_URL, "BETTER_AUTH_URL");
    requireValue(environment.RESEND_API_KEY, "RESEND_API_KEY");
    requireValue(environment.AUTH_EMAIL_FROM, "AUTH_EMAIL_FROM");
  }

  const auth = readAuthConfig(environment, databaseUrl, google);

  return {
    allowedOrigins: readAllowedOrigins(environment.CORS_ALLOWED_ORIGINS),
    auth,
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
    trustedProxyIps: readTrustedProxyIps(environment.TRUSTED_PROXY_IPS),
    version: environment.API_VERSION?.trim() || defaultVersion,
  };
}

function readAuthConfig(
  environment: Record<string, string | undefined>,
  databaseUrl: string | undefined,
  google: AuthConfig["google"],
): AuthConfig | undefined {
  const secret = environment.BETTER_AUTH_SECRET?.trim();
  const baseUrl = environment.BETTER_AUTH_URL?.trim();
  const resendApiKey = environment.RESEND_API_KEY?.trim();
  const emailFrom = environment.AUTH_EMAIL_FROM?.trim();
  const configured = Boolean(secret || baseUrl || resendApiKey || emailFrom || google);

  if (!configured) return undefined;
  if (!databaseUrl) throw new Error("DATABASE_URL is required when authentication is configured");
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  }
  if (!baseUrl) throw new Error("BETTER_AUTH_URL is required when authentication is configured");
  const parsedBaseUrl = readOrigin(baseUrl);
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is required when authentication is configured");
  }
  if (!emailFrom) throw new Error("AUTH_EMAIL_FROM is required when authentication is configured");

  return { baseUrl: parsedBaseUrl, emailFrom, google, resendApiKey, secret };
}

function readGoogleConfig(environment: Record<string, string | undefined>): AuthConfig["google"] {
  const clientId = environment.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = environment.GOOGLE_CLIENT_SECRET?.trim();
  const iosClientId = environment.GOOGLE_IOS_CLIENT_ID?.trim() || undefined;
  if (Boolean(clientId) !== Boolean(clientSecret)) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together");
  }
  // The iOS client only widens which id-token audiences are accepted; it is not
  // a provider of its own. Alone it would configure Google with no credentials
  // for the browser flow, and fail later and further away than here.
  if (iosClientId && !clientId) {
    throw new Error("GOOGLE_IOS_CLIENT_ID requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET");
  }
  return clientId && clientSecret ? { clientId, clientSecret, iosClientId } : undefined;
}

function requireValue(value: string | undefined, name: string): string {
  const result = value?.trim();
  if (!result) throw new Error(`${name} is required when NODE_ENV=production`);
  return result;
}

function readTrustedProxyIps(value: string | undefined): readonly string[] {
  return (value ?? "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean)
    .map((ip) => {
      if (isIP(ip) === 0) {
        throw new Error("TRUSTED_PROXY_IPS must list IP addresses");
      }
      return ip;
    });
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
