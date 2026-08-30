"use client";

import { signOut } from "@/lib/auth-client";

export function SignOut({ email, hideEmail = false }: { email: string; hideEmail?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {hideEmail ? null : (
        <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
      )}
      <button
        className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={async () => {
          await signOut();
          window.location.assign("/login");
        }}
        type="button"
      >
        退出
      </button>
    </div>
  );
}
