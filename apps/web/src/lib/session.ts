import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiUrl } from "@/lib/api";

export type WebSession = {
  user: { email: string; id: string; name: string };
};

export async function getSession(): Promise<WebSession | null> {
  const cookieHeader = (await cookies()).toString();
  try {
    const response = await fetch(apiUrl("/api/auth/get-session"), {
      cache: "no-store",
      headers: { cookie: cookieHeader },
    });
    if (!response.ok) return null;
    return (await response.json()) as WebSession | null;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<WebSession> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
