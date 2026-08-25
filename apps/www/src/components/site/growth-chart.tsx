/**
 * Hero visual. Abstract on purpose: it shows the *shape* the product is about —
 * a line that rises and can be traced back — without printing numbers that
 * would read as a real customer's data. Colours come from the chart tokens, so
 * it re-themes with the rest of the design system.
 */

// A rising curve with a realistic dip, drawn in a 0-560 x 0-220 viewBox.
const CURVE =
  "M 8 196 C 78 188, 118 166, 168 158 S 246 168, 284 132 S 366 118, 404 78 S 486 54, 552 20";
const AREA = `${CURVE} L 552 212 L 8 212 Z`;

// The flatter comparison line: what the same metric looked like a year earlier.
const BASELINE = "M 8 204 C 96 200, 160 194, 232 190 S 372 180, 448 172 S 520 166, 552 162";

export function GrowthChart({
  label,
  legendCurrent,
  legendPrior,
}: {
  label: string;
  legendCurrent: string;
  legendPrior: string;
}) {
  return (
    <figure className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <figcaption className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
        <span className="font-heading text-sm font-medium">{label}</span>
        <span className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-chart-1" />
            {legendCurrent}
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-chart-4" />
            {legendPrior}
          </span>
        </span>
      </figcaption>

      <svg
        aria-hidden="true"
        className="block h-auto w-full"
        preserveAspectRatio="none"
        viewBox="0 0 560 220"
      >
        <defs>
          <linearGradient id="growth-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gridlines echo the axes the product is built around. */}
        <g stroke="var(--border)" strokeWidth="1">
          {[20, 68, 116, 164, 212].map((y) => (
            <line key={y} x1="8" x2="552" y1={y} y2={y} />
          ))}
        </g>

        <path d={AREA} fill="url(#growth-fill)" />
        <path
          d={BASELINE}
          fill="none"
          stroke="var(--chart-4)"
          strokeDasharray="5 5"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          d={CURVE}
          fill="none"
          stroke="var(--chart-1)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        <circle cx="552" cy="20" fill="var(--chart-1)" r="4.5" />
        <circle
          cx="552"
          cy="20"
          fill="none"
          opacity="0.35"
          r="9"
          stroke="var(--chart-1)"
          strokeWidth="2"
        />
      </svg>
    </figure>
  );
}
