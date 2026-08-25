import Image from "next/image";
import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * The logo lockup. `public/logo.png` is the single source of truth for the
 * mark — the colour ramps in `globals.css` are sampled from it.
 */
export function BrandMark({
  locale,
  name,
  className,
}: {
  locale: Locale;
  name: string;
  className?: string;
}) {
  return (
    <Link
      className={cn(
        "group flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      href={`/${locale}`}
    >
      {/* The mark is drawn for light backgrounds — its navy L is only a shade
       * off `--background` in dark mode and all but disappears. Until there is
       * an SVG source with a dark variant, sit it on a light plaque there. */}
      <span className="flex size-7 items-center justify-center rounded-md transition-transform duration-300 group-hover:-translate-y-px dark:bg-navy-100 dark:p-[3px]">
        <Image alt="" className="size-full" height={28} priority src="/logo.png" width={28} />
      </span>
      <span className="font-heading text-base font-semibold tracking-tight">{name}</span>
    </Link>
  );
}
