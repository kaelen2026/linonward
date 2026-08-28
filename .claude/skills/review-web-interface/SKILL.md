---
name: review-web-interface
description: Review LinOnward UI code and rendered behavior for usability, accessibility, responsive layout, content, and interaction quality. Use for explicit UI, UX, design, or accessibility reviews; report findings without changing code unless fixes are requested.
---

# Review a LinOnward web interface

Review the requested scope against the repository's design system and application rules first, then the interface checklist below. Inspect rendered behavior when the finding depends on layout, focus, keyboard interaction, responsive behavior, color scheme, or runtime state.

If current upstream guidance is useful and network access is available, consult Vercel's latest [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md). Repository-specific rules win when guidance differs.

## Review checklist

- **Structure:** landmarks, heading order, semantic elements, logical reading and tab order.
- **Actions:** native semantics or correct Base UI primitives, accessible names, visible focus, keyboard operation, disabled and pending behavior, and adequate touch targets.
- **Forms:** persistent labels, appropriate input type and autocomplete, errors tied to fields, preserved user input, and actionable recovery text.
- **Content:** specific control labels, consistent terminology, useful empty/error states, safe wrapping and truncation, and no hardcoded official-site copy outside `site.ts`.
- **Responsive layout:** no accidental overflow, reachable controls, sensible density, stable layout, and behavior at both configured Playwright viewports.
- **Visual system:** semantic tokens, sufficient contrast, dark-mode behavior, typography and CJK fallback, spacing rhythm, and no unjustified one-off styles.
- **Motion and media:** reduced-motion support, meaningful alt text, explicit media dimensions when needed, and animation that does not block interaction.
- **State and performance:** URL-addressable navigation state where appropriate, hydration-safe rendering, clear loading feedback, and no obvious request waterfall or oversized client boundary.
- **Localization:** both `zh` and `en`, correct `lang`, locale-aware formatting, and layouts that survive different string lengths.

## Findings

Report only actionable findings, ordered by user impact. For each, give the file and tight line range, the observed problem, who or what is affected, and a concrete correction. Separate confirmed defects from items that require rendered verification. If no actionable findings remain, say so and name any unverified surface.

See [references/sources.md](references/sources.md) for provenance and the rejected mismatched implementations.
