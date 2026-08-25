# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is pnpm `11.19.0`, pinned via `packageManager`; run `corepack enable` first.
Node `>= 24` (`.nvmrc`). Root scripts fan out through Turborepo.

```bash
pnpm install                          # also installs git hooks via `prepare`
pnpm dev                              # all apps (persistent, uncached)
pnpm build
pnpm typecheck                        # tsc --noEmit per workspace
pnpm lint                             # Biome check — does NOT write
pnpm lint:fix                         # Biome autofix
pnpm format                           # Biome format only
```

Target one workspace with `--filter` and the full package name:

```bash
pnpm --filter @linonward/www dev
pnpm --filter @linonward/www build
```

`build` and `typecheck` are Turborepo-cached; a no-op rerun replays from cache. Force a real
run with `--force`, or `rm -rf .turbo` if a result looks stale.

**There is no test runner in this repo** — no test script, no vitest/jest, no test files. Do not
invent `pnpm test`. If tests are needed, adding the runner is itself the task; ask before wiring
one in, since it means new deps, a `test` task in `turbo.json`, and a `.lintstagedrc.mjs` glob.

Verification before calling work done is `pnpm lint` + `pnpm typecheck` (+ `pnpm build` for
anything touching the build).

## Architecture

pnpm workspace (`apps/*`, `packages/*`) driven by Turborepo. Two workspaces today:
`@linonward/www` (the Next.js 16 App Router site) and `@linonward/typescript-config` (shared
tsconfig presets). Internal deps use `workspace:*`, so pnpm links from disk.

`docs/` carries the long-form detail: `architecture.md`, `development.md`, `conventions.md`,
`deployment.md`. Read those before restructuring anything, and keep them current when you do.

### Turborepo task graph

`turbo.json` tasks: `build`, `dev`, `start`, `typecheck`, `clean`. `build` and `typecheck`
declare `dependsOn: ["^build"]` — build every *dependency workspace* first — so cross-workspace
ordering is automatic; don't hand-wire it.

Lint and format are deliberately **not** Turborepo tasks. Biome is one binary that walks the
whole repo in a single pass, so it runs from the root. Don't add per-workspace lint tasks.

### UI stack: Base UI, not Radix

`apps/www` uses shadcn/ui in its `base-nova` style, which is built on **`@base-ui/react`** — there
are no `@radix-ui/*` packages here. This changes how components are written:

- Composition uses a **`render` prop**, not `asChild`/`Slot`:
  `<Button render={<a href="…" />} size="lg">` (see `src/app/page.tsx`).
- Custom primitives use `useRender` + `mergeProps` from `@base-ui/react` (see
  `src/components/ui/badge.tsx`).
- Variants are `cva` from `class-variance-authority`, merged through `cn()` in `src/lib/utils.ts`.

Copying stock shadcn/Radix snippets from the web will not compile. Match the existing files.

`src/components/ui/` components are owned in-repo and safe to edit — there is no upstream to keep
in sync. Add new ones with the CLI **run from inside the app** so it reads that app's
`components.json`:

```bash
cd apps/www && pnpm dlx shadcn@latest add dialog
```

### Tailwind v4 theming

No `tailwind.config.js` — Tailwind v4 is configured in CSS. `src/app/globals.css` imports
`tailwindcss`, `tw-animate-css`, and `shadcn/tailwind.css`, then maps design tokens in a
`@theme inline` block onto CSS custom properties defined in `:root` and `.dark`. Dark mode is a
`@custom-variant` keyed on `.dark`.

Add or change a color/radius token in **both** places: the `--color-*` mapping in `@theme inline`
and the underlying property in `:root`/`.dark`. Colors are `oklch()`.

Fonts work by naming the `next/font` CSS variables `--font-sans` and `--font-mono` on `<html>` in
`layout.tsx` — that is exactly what the theme block reads. Renaming those variables silently
breaks typography.

### TypeScript

`apps/www/tsconfig.json` extends `@linonward/typescript-config/nextjs.json`, which extends
`base.json`. Base is aggressively strict and two settings shape everyday code:

- `verbatimModuleSyntax` — type-only imports **must** be `import type { … }`, or the build fails.
- `noUncheckedIndexedAccess` — `arr[0]` and `obj[key]` are `T | undefined`; narrow before use.

Also on: `strict`, `isolatedModules`, `noEmit`. `base.json` uses NodeNext resolution;
`nextjs.json` overrides to ESNext/Bundler for the app. Path alias is `@/*` → `./src/*`.

`next.config.ts` sets `typedRoutes: true`, so route strings are checked — a typo'd `href` is a
type error, and new routes need a build/`typecheck` pass before they resolve.

## Conventions

Biome is the only linter/formatter — no ESLint, no Prettier. 2-space indent, 100-column lines, LF,
double quotes, semicolons, trailing commas, import sorting via Biome assist. Unused imports and
variables are **errors**; `any` is a warning; `noNonNullAssertion` is off.

Naming: workspace packages `@linonward/<name>`; React components `PascalCase` under
`src/components/`; shadcn primitives keep the CLI's `kebab-case` names in `src/components/ui/`.

Git — commit format, hooks, staging and branch rules — is in
[`.claude/rules/git.md`](.claude/rules/git.md). Commits are Conventional Commits enforced by
commitlint in a `commit-msg` hook; `pre-commit` runs `lint-staged` → Biome on staged
JS/TS/JSON/CSS (Markdown and YAML have no hook).

## Gotchas

- **pnpm blocks postinstall scripts by default.** If a dependency's build script is skipped, add
  the package to `onlyBuiltDependencies` in `pnpm-workspace.yaml` and reinstall.
- A new app or package must expose `dev`, `build`, and `typecheck` scripts to join the task graph,
  extend a shared tsconfig, and list `@linonward/typescript-config: workspace:*`. Then
  `pnpm install` to link it. Full steps in `docs/development.md`.
- Vercel deploys with Root Directory `apps/www` and needs *Include files outside the root
  directory* enabled so workspace packages resolve. See `docs/deployment.md`.
