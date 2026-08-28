/**
 * URL assembly for the one API origin a build talks to.
 *
 * Deliberately pure: no BuildProfile, no HTTP client, no ArkUI. That is what
 * lets `entry/src/test` cover it on the host without a device, the same reason
 * `AuthenticationState` in apps/ios holds no URLSession.
 */

const TRAILING_SLASHES = /\/+$/;

/** A build with no origin configured is a real, expected state — release ships one. */
export function isApiConfigured(baseUrl: string): boolean {
  return baseUrl.trim().length > 0;
}

/**
 * Joins the build's origin with an API path, tolerating a trailing slash on one
 * side and a missing leading slash on the other.
 *
 * Throws when the build carries no origin: callers must ask `isApiConfigured`
 * first and show "no server configured" rather than send a request to nowhere.
 */
export function resolveApiEndpoint(baseUrl: string, path: string): string {
  const origin: string = baseUrl.trim().replace(TRAILING_SLASHES, '');
  if (origin.length === 0) {
    throw new Error('This build has no API origin configured.');
  }
  const suffix: string = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${suffix}`;
}
