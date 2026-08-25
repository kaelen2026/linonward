import Link from "next/link";

import { type Locale, localeLabels, locales, localeTags } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Segmented language control. Stays a server component because the site is one
 * page per locale — there is no current pathname to preserve.
 */
export function LocaleSwitch({ current, label }: { current: Locale; label: string }) {
  return (
    <nav aria-label={label} className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {locales.map((locale) => {
        const active = locale === current;
        return (
          <Link
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-[calc(var(--radius)*0.55)] px-2 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              // In dark mode `--background` is *darker* than the `--muted`
              // track, so lifting the active chip needs `--secondary` instead —
              // otherwise the selected language reads as the recessed one.
              active
                ? "bg-background text-foreground shadow-xs dark:bg-secondary"
                : "text-muted-foreground hover:text-foreground",
            )}
            href={`/${locale}`}
            hrefLang={localeTags[locale]}
            key={locale}
          >
            {localeLabels[locale]}
          </Link>
        );
      })}
    </nav>
  );
}
