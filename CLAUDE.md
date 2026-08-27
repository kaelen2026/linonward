# CLAUDE.md

*Must output before*
**Yeah, LinOnward**

Guidance for Claude Code (claude.ai/code) in this repository.

Setup, scripts, and workspace layout are in [README.md](./README.md). Long-form detail is in
[`docs/`](./docs). Git rules — commit format, hooks, staging, branches — are in
[`.claude/rules/git.md`](.claude/rules/git.md), TypeScript rules are in
[`.claude/rules/typescript.md`](.claude/rules/typescript.md), and how to write tests is in
[`.claude/rules/tdd.md`](.claude/rules/tdd.md). This file covers only what those don't: the
things that will bite an agent.

## Domain agents

Delegate frontend implementation in `apps/www` or `apps/web` to the project subagent
`frontend-engineer` when a focused context is useful. It preloads the `implement-frontend`
skill and follows the path-scoped rules in `.claude/rules/frontend.md`.

Delegate backend implementation in `apps/api`, `apps/feishu`, or `packages/db` to the project
subagent `backend-engineer` when a focused context is useful. It preloads the `implement-backend`
skill and follows the path-scoped rules in `.claude/rules/backend.md`. Keep cross-domain contract
changes with the main agent unless both sides are explicitly delegated.

Delegate SwiftUI implementation in `apps/ios` to the project subagent `ios-engineer` when a
focused iOS context is useful. It preloads the `implement-ios` skill and follows the path-scoped
rules in `.claude/rules/ios.md`. Keep backend contract and release changes with the main agent
unless both sides are explicitly delegated.

## Verification

`pnpm lint` + `pnpm typecheck` + `pnpm test`, plus `pnpm build` for anything touching the build.
Report real output; don't commit over red and call it done.

Two runners in `apps/www`. **Vitest** with Testing Library for logic and components, next to
the code as `*.test.{ts,tsx}` — `pnpm test`, or `pnpm --filter @linonward/www test:watch` for
the TDD loop. **Playwright** for end-to-end, in `e2e/**/*.spec.ts` — `pnpm test:e2e`, which
builds first and drives Chromium at two viewports. Neither runs in `pre-commit`; CI runs both
in parallel jobs.

Two traps worth knowing up front: an `async` server component cannot be rendered by Vitest at
all (a synchronous one can), and Playwright locators must be scoped to a landmark — the header
and footer both hold a nav and a language switcher, so a bare `getByRole` matches twice. Read
[`.claude/rules/tdd.md`](.claude/rules/tdd.md) before writing a test.

## UI: Base UI, not Radix

`apps/www` uses shadcn/ui in its `base-nova` style, built on **`@base-ui/react`**. There are no
`@radix-ui/*` packages here, so stock shadcn/Radix snippets copied from the web will not compile.

- Composition uses a **`render` prop**, not `asChild`/`Slot`:
  `<Button render={<a href="…" />} size="lg">` — see `src/app/[locale]/page.tsx`.
- Custom primitives use `useRender` + `mergeProps` — see `src/components/ui/badge.tsx`.
- Variants are `cva`, merged through `cn()` in `src/lib/utils.ts`.

Match the existing files. Components in `src/components/ui/` are owned in-repo and safe to edit.
Add new ones with the CLI run **from inside the app**, so it reads that app's `components.json`:

```bash
cd apps/www && pnpm dlx shadcn@latest add dialog
```

## Tailwind v4 has no config file

Theming lives in `src/app/globals.css`, in three layers. Know which one you are editing:

- A plain `@theme` block holds the **brand ramp** (`--color-navy-*`, `--color-teal-*`), sampled
  from `public/logo.png`. Static — identical in light and dark, so no indirection.
- `:root` plus a `@media (prefers-color-scheme: dark)` block hold the **semantic tokens**, each
  pointing at a ramp step. This is the layer that flips. Retuning a color or radius means
  editing here and nowhere else.
- `@theme inline` maps `--color-primary` → `var(--primary)`. Adding a **new** semantic token means
  editing this **and** both `:root` blocks; miss this and the utility class silently doesn't
  exist.

Colors are `oklch()`. Dark mode follows **`prefers-color-scheme`** — the scaffold's
`@custom-variant dark (&:is(.dark *))` override is deliberately gone, so Tailwind v4's built-in
media-query `dark:` variant applies and the token block is keyed on the same media query. Moving
back to a class strategy means reintroducing a blocking inline script to set the class before
first paint; React does not execute a `<script>` rendered from a component on the client, so
Next.js logs a console error for the obvious implementation. There is no theme toggle.

Brand teal (`teal-500`) is **2.61:1 on white** — never body text on a light surface. Use the
`brand` Button variant (teal surface, navy label, 5.73:1) or step down to `teal-700` for teal
text. Full reasoning and the contrast table: [docs/design-system.md](./docs/design-system.md).

Fonts are a two-file contract: `layout.tsx` names the `next/font` variables `--font-geist-sans`
and `--font-geist-mono`, and `globals.css` builds `--font-sans` from those **plus a system CJK
fallback stack**. Rename one side without the other and Chinese text silently falls back to the
browser default. Do not add `uppercase` or wide `tracking` to shared text styles — both are
useless or harmful in Chinese.

## The site is bilingual

Every route lives under `src/app/[locale]/`, and that is where the **root layout** is — there is
no `src/app/layout.tsx`. Locales are `zh` (default) and `en`, declared in `src/lib/i18n.ts`;
`next.config.ts` redirects `/` → `/zh`.

All copy lives in `src/content/site.ts` as `Record<Locale, SiteContent>`, so a section added to
one language fails to compile until the other has it too. Put strings there, not in components.

`Button` rendered as a link needs `nativeButton={false}` — Base UI asserts a native `<button>`
otherwise and warns at runtime about the lost semantics.

## TypeScript settings that change how you write code

- `verbatimModuleSyntax` — type-only imports **must** be `import type { … }`.
- `noUncheckedIndexedAccess` — `arr[0]` is `T | undefined`; narrow before use.
- `typedRoutes` — `PageProps<…>`, `LayoutProps<…>` **and** `href` validation all come from
  types Next *generates* into `.next/types`. They are not imports, and nothing warns when they are
  absent. Hence `apps/www`'s `typecheck` is `next typegen && tsc --noEmit`.

  Bare `tsc` fails two ways, one loud and one silent. Loud: `Cannot find name 'PageProps'`.
  Silent: it stops checking `href` altogether, so `<Link href="/nope/nope/nope">` compiles
  clean. Deleting the helpers in favour of hand-written `params` types quiets the loud half and
  leaves the silent one — CI would then pass while validating no routes at all. Keep the
  `next typegen`: it costs under a second, against six for the `next build` that is the only
  other way to get the same definitions.

## Gotchas

- Lint and format are deliberately **not** Turborepo tasks. Biome is one binary that walks the
  whole repo in a single pass from the root; don't add per-workspace lint tasks.
- **pnpm blocks postinstall scripts.** If a dependency's build script is skipped, add it to
  `onlyBuiltDependencies` in `pnpm-workspace.yaml` and reinstall.
- Turborepo caches `build` and `typecheck`. If a result looks stale, rerun with `--force` or
  `rm -rf .turbo`.
