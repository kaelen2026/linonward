# Design system

The palette is derived from `apps/www/public/logo.png` — nothing here was picked by eye. All of
it lives in [`apps/www/src/app/globals.css`](../apps/www/src/app/globals.css); this document
explains the reasoning so the next change doesn't undo it.

## The two brand colours

The mark is a navy `L` with a teal arrow rising through it. Sampling every opaque pixel gives two
dominant clusters and nothing else:

| Role in the mark | HEX | oklch | Scale slot |
| --- | --- | --- | --- |
| The `L` | `#03274D` | `oklch(0.2727 0.0806 253.54)` | `navy-900` |
| The rising arrow | `#0DB2B3` | `oklch(0.6924 0.1165 195.52)` | `teal-500` |

Both ramps are built by holding the sampled hue constant, walking lightness along a fixed curve,
and tapering chroma at the ends so tints stay clean and shades stay in gamut. The ramps are
*anchored*: `navy-900` and `teal-500` are the sampled values exactly, not approximations. Change
the logo and these two rows are what you re-sample.

### navy — hue 253.54

| Step | oklch | HEX |
| --- | --- | --- |
| `navy-50` | `0.975 0.010` | `#f2f7fe` |
| `navy-100` | `0.945 0.019` | `#e4eefa` |
| `navy-200` | `0.895 0.032` | `#cedef2` |
| `navy-300` | `0.825 0.048` | `#b1c8e5` |
| `navy-400` | `0.760 0.066` | `#94b4db` |
| `navy-500` | `0.692 0.081` | `#789fce` |
| `navy-600` | `0.600 0.080` | `#5e83af` |
| `navy-700` | `0.500 0.076` | `#44658e` |
| `navy-800` | `0.390 0.073` | `#27466b` |
| **`navy-900`** | `0.273 0.081` | **`#03274d`** |
| `navy-950` | `0.180 0.066` | `#00112d` |

### teal — hue 195.52

| Step | oklch | HEX |
| --- | --- | --- |
| `teal-50` | `0.975 0.015` | `#ecfafa` |
| `teal-100` | `0.945 0.028` | `#d8f3f3` |
| `teal-200` | `0.895 0.047` | `#b9e7e6` |
| `teal-300` | `0.825 0.070` | `#8fd4d4` |
| `teal-400` | `0.760 0.096` | `#5dc4c4` |
| **`teal-500`** | `0.692 0.117` | **`#0db2b3`** |
| `teal-600` | `0.600 0.115` | `#009596` |
| `teal-700` | `0.500 0.110` | `#007677` |
| `teal-800` | `0.390 0.105` | `#005557` |
| `teal-900` | `0.273 0.117` | `#003639` |
| `teal-950` | `0.180 0.096` | `#001b1f` |

## The one rule that shapes everything

**Brand teal is a surface, never body text on a light background.**

`teal-500` on white is **2.61:1** — it fails WCAG AA for text at any size that matters. The
temptation is to reach for it as a link or accent-text colour; don't.

What works instead, and why it looks right:

| Pairing | Ratio | Use |
| --- | --- | --- |
| `navy-900` on `teal-500` | **5.73:1** | The primary CTA. This is the logo's own pairing. |
| `teal-700` on white | **5.44:1** | Teal *text* on a light surface. |
| `teal-300` on `navy-950` | 11.21:1 | Teal text in dark mode. |
| `navy-900` on white | 14.99:1 | Body text. |
| `navy-700` on white | 6.00:1 | `--muted-foreground`. |
| `navy-400` on `navy-950` | 8.77:1 | `--muted-foreground`, dark. |
| `navy-950` on `teal-500` | 7.18:1 | The primary CTA, dark. |

So the brand button is teal-with-navy-label, in both themes — the `brand` variant on
`Button`. Every other text pairing in the semantic tokens clears 4.5:1.

## Token layers

Three layers, and the distinction matters when you edit:

1. **Brand ramp** — a plain `@theme` block. These values never change between light and dark, so
   they need no runtime indirection. This is what generates `bg-teal-500`, `text-navy-700`, and so on.
2. **Semantic tokens** — `:root` and `@media (prefers-color-scheme: dark) { :root { … } }`, each
   referencing a ramp step (`--primary: var(--color-navy-900)`). This is the layer that flips.
3. **Tailwind mapping** — the `@theme inline` block, which points `--color-primary` at
   `var(--primary)` so `bg-primary` follows the theme.

Changing a semantic colour means editing **layer 2 only**. Adding a *new* semantic token means
editing layer 2 **and** layer 3 — miss the second and the utility class silently doesn't exist.

### Semantic mapping

| Token | Light | Dark |
| --- | --- | --- |
| `background` | white | `navy-950` |
| `foreground` | `navy-900` | `navy-50` |
| `card` | white | `navy-900` |
| `primary` / `primary-foreground` | `navy-900` / `navy-50` | `teal-500` / `navy-950` |
| `secondary` | `navy-50` | `navy-800` |
| `muted` / `muted-foreground` | `navy-50` / `navy-700` | `navy-900` / `navy-400` |
| `accent` / `accent-foreground` | `teal-50` / `teal-800` | `navy-800` / `teal-300` |
| `brand` / `brand-foreground` | `teal-500` / `navy-900` | `teal-500` / `navy-950` |
| `brand-subtle` | `teal-50` / `teal-800` | `teal-900` / `teal-300` |
| `border` | `navy-200` | `white / 12%` |
| `ring` | `teal-500` | `teal-500` |

`brand` is the extra pair this palette adds on top of stock shadcn — it exists because `primary`
has to stay a neutral-dark in light mode for body-level UI, while the CTA wants the logo's teal.

Chart tokens alternate teal and navy at different lightnesses (`chart-1` = `teal-500`, `chart-2` =
`navy-600`, …) so series stay distinguishable in greyscale as well as in colour. Two hues only
carries about five categories; a real categorical palette needs more hues than the logo provides.

### Dark mode strategy

Dark mode follows the operating system, via `prefers-color-scheme`. There is no `.dark` class and
no theme toggle, which is a deliberate trade:

- Tailwind v4's built-in `dark:` variant is already that media query, so utilities and tokens
  agree without a custom variant.
- A manual override needs the class strategy, which needs a blocking inline script to set the
  class before first paint — and React never executes a `<script>` rendered from a component on
  the client, so the straightforward version logs a Next.js console error.
- `:root` declares `color-scheme: light dark`, so scrollbars, form controls, and the canvas
  follow along too.

Adding a toggle later means: restore `@custom-variant dark (&:is(.dark *))`, move the dark token
block back to a `.dark` selector, and inject the pre-paint script somewhere React does not own.

## Radius

`--radius: 0.75rem`, up from the scaffold's `0.625rem`, to match the generous rounding on the
`L`'s terminals. Everything else derives from it via the `--radius-*` multipliers, so this is a
one-line change.

## Typography

Geist for latin, system CJK for Chinese — deliberately not a webfont. A subsetted Chinese webfont
is megabytes; on a landing page the system stack (PingFang SC, Hiragino Sans GB, Microsoft YaHei,
Noto Sans CJK SC) renders instantly and looks native on every platform.

The wiring is a two-file contract:

- `layout.tsx` names the `next/font` variables **`--font-geist-sans`** and **`--font-geist-mono`**.
- `globals.css` builds `--font-sans` by putting the CJK stack *after* `var(--font-geist-sans)`.

Rename either side without the other and the CJK fallback is silently dropped — Chinese text
falls through to the browser default and the page looks subtly wrong rather than broken.

**Bilingual typography note:** don't reach for `uppercase` or wide `tracking` on section kickers.
Neither does anything useful in Chinese, and letter-spacing actively damages CJK rhythm. The
`Eyebrow` component gets its emphasis from a brand-coloured dot and weight instead.

## Brand utilities

Three composed classes in `globals.css`, all keyed to the 45° axis the arrow travels:

- `.brand-gradient-text` — navy → teal gradient clipped to text, for the accent line of a headline.
- `.brand-wash` — two faint offset radial washes, for hero and closing bands.
- `.brand-grid` — a masked hairline grid, echoing chart axes.

## Verifying a change

The contrast figures above are computed, not eyeballed. If you retune a token, recompute rather
than trusting a screenshot — a pairing can look fine on a good monitor and still fail AA.

Known gap: the mark itself is a PNG drawn for light backgrounds, so in dark mode `BrandMark` sits
it on a light plaque. An SVG source with a dark variant would remove that workaround.
