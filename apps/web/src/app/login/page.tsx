import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "登录" };

export default async function LoginPage() {
  if (await getSession()) redirect("/");

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6 py-16">
      <section
        className="w-full rounded-lg border border-border p-6 sm:p-8"
        aria-labelledby="title"
      >
        <p className="text-sm font-medium text-muted-foreground">LinOnward Web</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight" id="title">
          登录内部控制台
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">使用工作邮箱验证码完成登录。</p>
        <LoginForm googleEnabled={process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true"} />
      </section>
    </main>
  );
}
