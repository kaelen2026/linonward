/**
 * Origin of `apps/api`, for the browser to submit the contact form to.
 *
 * `NEXT_PUBLIC_` because the value reaches the client either way — the form
 * fetches from the browser so the API can rate-limit per visitor. The prefix
 * says so out loud, which keeps anyone from filing a secret here.
 *
 * Read at build time and frozen into the bundle, so one image cannot be
 * promoted across environments: set it per `next build`.
 *
 * The default matches the API's own default port, so `pnpm dev` in both
 * workspaces talks to itself with no `.env` at all.
 */
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
