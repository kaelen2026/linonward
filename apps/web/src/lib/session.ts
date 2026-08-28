import { type WebSession, webSessionSchema } from "@linonward/contracts/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiUrl } from "@/lib/api";

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
