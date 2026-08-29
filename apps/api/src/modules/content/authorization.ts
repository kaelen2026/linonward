import {
  type ContentCapability,
  type ContentRole,
  contentCapabilities,
} from "@linonward/contracts/content";
import { ApiError } from "../../shared/api-error.js";

export type { ContentCapability, ContentRole } from "@linonward/contracts/content";
export type ContentSession = { user: { id: string; email: string; name: string } } | null;
export type ContentPrincipal = NonNullable<ContentSession> & { roles: readonly ContentRole[] };

export function contentPrincipal(
  session: ContentSession,
  assignedRoles: readonly ContentRole[],
  bootstrapAdministratorEmails: readonly string[],
): ContentPrincipal {
  if (!session) throw new ApiError(401, "unauthorized", "Sign in is required");
  const email = session.user.email.trim().toLowerCase();
  const roles = bootstrapAdministratorEmails.includes(email)
    ? (["administrator"] as const)
    : assignedRoles;
  return { user: { ...session.user, email }, roles };
}

const editorCapabilities = new Set<ContentCapability>([
  "article.view",
  "article.createDraft",
  "article.updateDraft",
]);

export function capabilitiesFor(principal: ContentPrincipal): readonly ContentCapability[] {
  return principal.roles.includes("administrator")
    ? contentCapabilities
    : [...editorCapabilities].filter(
        (capability) => principal.roles.includes("editor") && editorCapabilities.has(capability),
      );
}

export function authorizeContent(
  principal: ContentPrincipal,
  capability: ContentCapability,
): ContentPrincipal {
  const allowed = capabilitiesFor(principal).includes(capability);
  if (!allowed) throw new ApiError(403, "forbidden", "Content permission is required");
  return principal;
}
