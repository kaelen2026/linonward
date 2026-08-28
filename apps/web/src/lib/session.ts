import { type WebSession, webSessionSchema } from "@linonward/contracts/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiUrl } from "@/lib/api";
import { isAdministrator, readAdministratorEmails } from "@/lib/authorization";

export type { WebSession } from "@linonward/contracts/session";

export async function getSession(): Promise<WebSession | null> {
  const cookieHeader = (await cookies()).toString();
  try {
    const response = await fetch(apiUrl("/api/auth/get-session"), {
      cache: "no-store",
      headers: { cookie: cookieHeader },
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

/** Require both an authenticated session and the internal-console role. */
export async function requireAdministrator(): Promise<WebSession> {
  const session = await requireSession();
  const administrators = readAdministratorEmails(process.env.INTERNAL_CONSOLE_ADMIN_EMAILS);
  if (!isAdministrator(session, administrators)) redirect("/unauthorized");
  return session;
}
