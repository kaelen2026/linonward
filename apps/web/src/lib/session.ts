import { type ContentAccess, contentAccessSchema } from "@linonward/contracts/content";
import { type WebSession, webSessionSchema } from "@linonward/contracts/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiUrl } from "@/lib/api";
import {
  bootstrapAdministratorAccess,
  isAdministrator,
  readAdministratorEmails,
} from "@/lib/authorization";

export type { WebSession } from "@linonward/contracts/session";

export async function getSession(cookieHeader?: string): Promise<WebSession | null> {
  const sessionCookie = cookieHeader ?? (await cookies()).toString();
  try {
    const response = await fetch(apiUrl("/api/auth/get-session"), {
      cache: "no-store",
      headers: { cookie: sessionCookie },
    });
    if (!response.ok) return null;
    const parsed = webSessionSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<WebSession> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Operational pages remain restricted to bootstrap administrators. */
export async function requireAdministrator(): Promise<WebSession> {
  const session = await requireSession();
  const administrators = readAdministratorEmails(process.env.INTERNAL_CONSOLE_ADMIN_EMAILS);
  if (!isAdministrator(session, administrators)) redirect("/unauthorized");
  return session;
}

async function getContentAccess(cookieHeader: string): Promise<ContentAccess | null> {
  try {
    const response = await fetch(apiUrl("/api/content/admin/access"), {
      cache: "no-store",
      headers: { cookie: cookieHeader },
    });
    if (!response.ok) return null;
    const parsed = contentAccessSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Require an authenticated administrator or editor and return server-authoritative capabilities. */
export async function requireContentManager(): Promise<{
  session: WebSession;
  access: ContentAccess;
}> {
  const cookieHeader = (await cookies()).toString();
  const session = await getSession(cookieHeader);
  if (!session) redirect("/login");
  const administrators = readAdministratorEmails(process.env.INTERNAL_CONSOLE_ADMIN_EMAILS);
  const access = isAdministrator(session, administrators)
    ? bootstrapAdministratorAccess()
    : await getContentAccess(cookieHeader);
  if (!access) redirect("/unauthorized");
  return { session, access };
}
