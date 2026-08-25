import { cn } from "@/lib/utils";

/**
 * Section kicker. Deliberately avoids `uppercase` and wide letter-spacing —
 * both are no-ops or actively harmful for the Chinese locale, so the emphasis
 * comes from the brand-coloured dot and weight instead.
 */
export function Eyebrow({ children, className }: { children: string; className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 text-sm font-medium text-teal-700 dark:text-teal-300",
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
      {children}
    </p>
  );
}
