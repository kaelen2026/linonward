const defaultPort = 3001;
const defaultVersion = "0.0.0";

export type ApiConfig = {
  /** Browser origins allowed to call the API. Empty disables CORS entirely. */
  allowedOrigins: readonly string[];
  host: string;
  port: number;
  /** Reported by `GET /health`, so a running deploy can be identified. */
  version: string;
};

export function loadApiConfig(environment: Record<string, string | undefined>): ApiConfig {
  return {
    allowedOrigins: readAllowedOrigins(environment.CORS_ALLOWED_ORIGINS),
    host: environment.HOST?.trim() || "0.0.0.0",
    port: readPort(environment.PORT),
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
