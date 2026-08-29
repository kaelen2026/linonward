import {
  type ContentAccess,
  type ContentCapability,
  contentCapabilities,
} from "@linonward/contracts/content";
import type { WebSession } from "@linonward/contracts/session";

/**
 * The internal console has one role today: administrator. Keeping the policy
 * server-only makes an accidental client-side exposure of the allow-list
 * impossible, and gives us one narrow seam to replace with identity-provider
 * groups when those are available.
 */
export function isAdministrator(
  session: WebSession,
  administratorEmails: readonly string[],
): boolean {
  return administratorEmails.includes(session.user.email.trim().toLowerCase());
}

export function readAdministratorEmails(value: string | undefined): readonly string[] {
  return [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function bootstrapAdministratorAccess(): ContentAccess {
  return { roles: ["administrator"], capabilities: [...contentCapabilities] };
}

export function hasContentCapability(
  access: ContentAccess,
  capability: ContentCapability,
): boolean {
  return access.capabilities.includes(capability);
}
