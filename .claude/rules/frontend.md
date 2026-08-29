---
paths:
  - "apps/www/**/*"
  - "apps/web/**/*"
---

# Frontend rules

These rules apply to both Next.js applications. App-specific instructions take precedence when they are stricter.

## Framework and components

- Read the relevant documentation from `<app>/node_modules/next/dist/docs/` before changing Next.js APIs, conventions, routing, caching, or rendering behavior.
- Preserve generated route typing. Each app's `typecheck` must run `next typegen` before `tsc`; do not replace generated `PageProps` or `LayoutProps` with handwritten substitutes.
- Prefer server components. Add `"use client"` only at the smallest boundary that needs browser APIs, state, effects, or event handlers.
- Before adding a component, inspect the target app's existing implementation first: search its
  component directories, shared packages, imports, and `components.json` when present. Reuse or
  extend an existing component when it already covers the same semantic role; do not create a
  second component of the same type under another name or path. Add a new component only after
  confirming that no equivalent implementation exists, then reuse local design tokens and
  primitives before adding dependencies or one-off markup.
- Keep accessible names, landmarks, keyboard behavior, focus states, and semantic elements intact.

## Official site: `apps/www`

- Use the in-repository Base UI primitives. Do not introduce Radix APIs such as `asChild` or `Slot`.
- Compose Base UI components with `render`; when `Button` renders a link, set `nativeButton={false}`.
- Treat `src/app/globals.css` as the Tailwind v4 configuration. Do not add a Tailwind config file.
- Preserve media-query dark mode and the three-layer token model described in the root instructions and `docs/design-system.md`.
- Keep all user-facing copy in `src/content/site.ts`. Update both `zh` and `en` for structural or content additions.
- Preserve the `next/font` variable names and the CJK fallback contract.

## Consumer Web application: `apps/web`

- Do not assume `apps/www` components, brand tokens, localization model, or Base UI dependency also exist in this app.
- Follow the patterns and dependencies already present in `apps/web` unless the task explicitly introduces a shared frontend package.

## Verification

- Follow `.claude/rules/tdd.md` for behavioral changes.
- Run the affected workspace test and typecheck commands while iterating.
- Before handoff, run root `pnpm lint`, `pnpm typecheck`, and `pnpm test`; add `pnpm build` when the change affects application code, dependencies, configuration, routing, or build behavior.
- Report actual results and never describe a failing or skipped check as passing.
