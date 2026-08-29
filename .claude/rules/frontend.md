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
- Use TanStack Query for remote server state in client-side features. Put query keys, query/mutation
  options, cache invalidation, and request-state handling in feature hooks or query modules; do not
  reproduce them with ad hoc `useEffect` and local state.
- Route every HTTP request through the app's shared request client. Direct `fetch` calls are forbidden
  outside the single low-level request adapter that implements that client, including in components,
  hooks, route-facing feature modules, and server-side data modules. Keep base URL resolution,
  credentials, headers, serialization, response parsing, timeouts, and normalized errors in that
  shared request layer instead of repeating them at call sites.
- Keep transport functions independent of TanStack Query and UI concerns: request modules expose
  typed domain operations, while query modules compose those operations into queries and mutations.
  Components must not construct endpoints, parse transport responses, or know cache keys.
- Separate presentation from behavior. Presentation components receive render-ready data and event
  callbacks through props and remain free of requests, query/mutation orchestration, navigation,
  persistence, and business rules. Place those concerns in page/container components, feature hooks,
  query modules, or domain services, and test each layer at its own boundary.
- When modifying an existing flow that violates these rules, migrate the touched request and its
  affected UI boundary to this structure rather than adding another direct request or extending the
  coupling. A repository-wide migration is not required unless the task explicitly calls for one.

## Verification

- Follow `.claude/rules/tdd.md` for behavioral changes.
- Run the affected workspace test and typecheck commands while iterating.
- Before handoff, run root `pnpm lint`, `pnpm typecheck`, and `pnpm test`; add `pnpm build` when the change affects application code, dependencies, configuration, routing, or build behavior.
- Report actual results and never describe a failing or skipped check as passing.
