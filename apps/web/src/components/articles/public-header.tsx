import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link className="text-lg font-semibold tracking-tight" href="/">
          LinOnward
        </Link>
        <nav aria-label="主导航" className="flex items-center gap-7 text-sm">
          <Link href="/">首页</Link>
          <Link href="/articles">文章</Link>
          <Link className="text-muted-foreground" href="/login">
            登录
          </Link>
        </nav>
      </div>
    </header>
  );
}
