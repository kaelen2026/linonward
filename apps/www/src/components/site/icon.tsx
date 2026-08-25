import { LayoutDashboard, Plug, Route, Ruler, ShieldCheck, TrendingUp } from "lucide-react";

import type { IconName } from "@/content/site";

/**
 * Content files carry an icon *name*; the mapping to a component lives here so
 * `src/content/site.ts` stays free of JSX and importable from anywhere.
 */
const icons: Record<IconName, typeof Plug> = {
  plug: Plug,
  ruler: Ruler,
  "trending-up": TrendingUp,
  route: Route,
  "layout-dashboard": LayoutDashboard,
  "shield-check": ShieldCheck,
};

export function FeatureIcon({ name, className }: { name: IconName; className?: string }) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" className={className} strokeWidth={1.75} />;
}
