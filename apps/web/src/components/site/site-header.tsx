import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";
import { cn } from "@/lib/utils";

const publicNavItems = [
  { href: "/", label: "首页" },
  { href: "/articles", label: "文章" },
] as const;

const operationsNavItems = [
  { href: "/status", label: "状态" },
  { href: "/observability", label: "可观测性" },
] as const;

type SiteHeaderProps = {
  pathname: string;
  showOperations?: boolean;
  user?: {
    email: string;
    image?: string | null;
    name: string;
  };
};

export function SiteHeader({ pathname, showOperations = false, user }: SiteHeaderProps) {
  const navItems = [
    ...publicNavItems,
    ...(user ? [{ href: "/admin", label: "管理" } as const] : []),
    ...(showOperations ? operationsNavItems : []),
  ];

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:flex-nowrap sm:gap-6 sm:px-6 sm:py-0">
        <Link className="whitespace-nowrap text-lg font-semibold tracking-tight" href="/">
          LinOnward
        </Link>

        <nav
          aria-label="主导航"
          className="order-3 flex w-full items-center gap-1 overflow-x-auto border-t border-border pt-2 sm:order-none sm:ml-auto sm:w-auto sm:border-0 sm:pt-0"
        >
          {navItems.map((item) => {
            const active =
              item.href === pathname || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors",
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
        {user ? (
          <UserMenu email={user.email} image={user.image} name={user.name} side="bottom" />
        ) : (
          <Link className="text-sm text-muted-foreground" href="/login">
            登录
          </Link>
        )}
      </div>
    </header>
  );
}
