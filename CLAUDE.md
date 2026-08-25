# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repository.

Setup, scripts, and workspace layout are in [README.md](./README.md). Long-form detail is in
[`docs/`](./docs). Git rules — commit format, hooks, staging, branches — are in
[`.claude/rules/git.md`](.claude/rules/git.md). This file covers only what those don't: the
things that will bite an agent.

## Verification

`pnpm lint` + `pnpm typecheck`, plus `pnpm build` for anything touching the build. Report real
output; don't commit over red and call it done.

**There is no test runner here** — no `test` script, no vitest/jest, no test files. Do not invent
`pnpm test`. Adding a runner is itself the task, and worth asking about first: it means new deps,
a `test` task in `turbo.json`, and a `.lintstagedrc.mjs` glob.

## UI: Base UI, not Radix

`apps/www` uses shadcn/ui in its `base-nova` style, built on **`@base-ui/react`**. There are no
`@radix-ui/*` packages here, so stock shadcn/Radix snippets copied from the web will not compile.

- Composition uses a **`render` prop**, not `asChild`/`Slot`:
  `<Button render={<a href="…" />} size="lg">` — see `src/app/page.tsx`.
- Custom primitives use `useRender` + `mergeProps` — see `src/components/ui/badge.tsx`.
- Variants are `cva`, merged through `cn()` in `src/lib/utils.ts`.

Match the existing files. Components in `src/components/ui/` are owned in-repo and safe to edit.
Add new ones with the CLI run **from inside the app**, so it reads that app's `components.json`:

```bash
cd apps/www && pnpm dlx shadcn@latest add dialog
```

## Tailwind v4 has no config file

Theming lives in `src/app/globals.css`. Changing a color or radius token means editing **both**
the `--color-*` mapping in `@theme inline` and the underlying property in `:root`/`.dark`. Colors
are `oklch()`; dark mode is a `@custom-variant` keyed on `.dark`.

Fonts work because `layout.tsx` names the `next/font` CSS variables `--font-sans` and
`--font-mono` on `<html>` — exactly what the theme block reads. Renaming them silently breaks
typography.

## TypeScript settings that change how you write code

- `verbatimModuleSyntax` — type-only imports **must** be `import type { … }`.
- `noUncheckedIndexedAccess` — `arr[0]` is `T | undefined`; narrow before use.
- `typedRoutes` — a typo'd `href` is a type error, and new routes need a `build` or `typecheck`
  pass before they resolve.

## Gotchas

- Lint and format are deliberately **not** Turborepo tasks. Biome is one binary that walks the
  whole repo in a single pass from the root; don't add per-workspace lint tasks.
- **pnpm blocks postinstall scripts.** If a dependency's build script is skipped, add it to
  `onlyBuiltDependencies` in `pnpm-workspace.yaml` and reinstall.
- Turborepo caches `build` and `typecheck`. If a result looks stale, rerun with `--force` or
  `rm -rf .turbo`.
