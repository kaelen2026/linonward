import Link from "next/link";
import { SignOut } from "@/components/auth/sign-out";
import { cn } from "@/lib/utils";

export const navItems = [
  { href: "/", label: "概览" },
  { href: "/status", label: "状态" },
] as const;

/**
 * The active page arrives as a prop rather than from `usePathname()`, so this
 * stays a server component: every page here knows its own route at build time,
 * and a client boundary in the layout would cost a bundle to learn nothing.
 */
export function SiteHeader({ pathname, userEmail }: { pathname: string; userEmail?: string }) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-6 px-6">
        <Link className="text-sm font-semibold tracking-tight" href="/">
          LinOnward Web
        </Link>

        <nav aria-label="主导航" className="flex items-center gap-1">
          {navItems.map((item) => {
            const active = item.href === pathname;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {userEmail ? <SignOut email={userEmail} /> : null}
      </div>
    </header>
  );
}
