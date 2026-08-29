import { ApiError } from "../../shared/api-error.js";

export type ContentSession = { user: { email: string; name: string } } | null;

export function requireContentAdministrator(
  session: ContentSession,
  administratorEmails: readonly string[],
) {
  if (!session) throw new ApiError(401, "unauthorized", "Sign in is required");
  if (!administratorEmails.includes(session.user.email.trim().toLowerCase())) {
    throw new ApiError(403, "forbidden", "Administrator access is required");
  }
  return session;
}
