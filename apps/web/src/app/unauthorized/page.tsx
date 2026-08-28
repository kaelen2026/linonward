import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">无访问权限</h1>
      <p className="mt-3 text-muted-foreground">此内部控制台仅向被明确授予管理员权限的成员开放。</p>
      <Link className="mt-6 inline-block underline underline-offset-4" href="/login">
        返回登录
      </Link>
    </main>
  );
}
