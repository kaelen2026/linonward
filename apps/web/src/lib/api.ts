/**
 * Origin of `apps/api`, the backend this app reads from.
 *
 * `NEXT_PUBLIC_` because the value is not a secret and client components need
 * it too. It is inlined at `next build` and frozen there, so one built image
 * cannot be promoted across environments — set it per build.
 *
 * The default matches the API's own default port, so `pnpm dev` in both
 * workspaces talks to itself with no `.env` at all.
 */
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Joins a path onto the API origin with exactly one slash between them.
 *
 * `new URL(path, base)` is the obvious alternative and the wrong one: it treats
 * the path as absolute and discards any base path, so an origin deployed under
 * `https://example.com/api` would lose the `/api`.
 */
export function apiUrl(path: string, base: string = apiBaseUrl): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
