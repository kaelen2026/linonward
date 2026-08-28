---
name: design-frontend
description: Define and execute an intentional visual direction for new or substantially redesigned LinOnward frontend surfaces. Use when a task includes visual design, a new page or section, or a material UI refresh; do not use for narrow bug fixes or copy-only edits.
---

# Design LinOnward frontend

## Start from the product

Read the brief, nearby UI, `docs/design-system.md`, and the target app's instructions. Identify the audience, the page's primary job, the information hierarchy, and the existing brand constraints before choosing a visual treatment. Preserve an explicit user direction; do not replace it with a preferred aesthetic.

For `apps/www`, treat its navy/teal ramp, semantic tokens, bilingual typography contract, and existing primitives as the design material. For `apps/web`, infer the system from that app rather than importing the official site's identity.

## Set a direction before coding

For a new page, section, or substantial redesign, form a compact design direction covering:

- hierarchy: the one element that should lead and the action or information that follows;
- layout: the organizing idea and how it adapts from mobile through wide screens;
- type: roles, scale, weight, and density, including Chinese and English behavior;
- color: existing semantic tokens and the contrast relationships they must preserve;
- signature: at most one memorable element justified by the subject;
- states: loading, empty, error, focus, hover, dark mode, and reduced motion when relevant.

Revise any choice that could be transplanted unchanged into an unrelated product. Structural devices must communicate real structure; decoration must earn its place.

## Build inside the system

Reuse local primitives and tokens. Extend the system only when the requested behavior cannot be expressed coherently with what exists. Keep Base UI composition, Tailwind v4 token layers, locale content placement, and server/client boundaries governed by repository instructions.

Treat words as interface material: use specific actions, consistent vocabulary, and error or empty-state copy that tells the user what to do next. Put official-site copy in both locale records.

Spend visual boldness in one place and keep the surrounding layout disciplined. Motion must clarify change or hierarchy, respect reduced motion, and never compensate for weak structure.

## Critique the rendered result

When rendering is available, inspect at mobile and desktop widths and in applicable color schemes. Check hierarchy, wrapping in both locales, spacing rhythm, interaction states, overflow, and whether the signature element overwhelms the page. Remove one nonessential flourish before handoff.

See [references/sources.md](references/sources.md) for the GitHub implementations that informed this skill.
