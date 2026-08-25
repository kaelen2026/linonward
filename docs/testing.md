# Testing

Vitest with Testing Library, in `apps/www`. The agent-facing rules are in
[`.claude/rules/tdd.md`](../.claude/rules/tdd.md); this page is the human
reference for how the setup works and why it is shaped this way.

## Running

```bash
pnpm test                                  # every workspace, via Turborepo — what CI runs
pnpm --filter @linonward/www test          # one workspace, once
pnpm --filter @linonward/www test:watch    # the TDD loop
```

Narrow it down while iterating:

```bash
pnpm --filter @linonward/www exec vitest run src/lib/i18n.test.ts
pnpm --filter @linonward/www exec vitest run -t "rejects an empty segment"
```

Turborepo caches `test`. An impossibly fast pass was replayed from cache, not
run — add `--force` to actually execute. That cache is shared across git
worktrees, so a stale pass can arrive from a sibling checkout.

## Setup

| File | Role |
| --- | --- |
| `apps/www/vitest.config.mts` | jsdom environment, React plugin, `src/**/*.test.{ts,tsx}` |
| `apps/www/vitest.setup.ts` | `@testing-library/jest-dom` matchers, `cleanup` after each test |

The config is `.mts` rather than `.ts` so Vite loads it as a real ES module —
as plain `.ts` it is read as CommonJS and Vite warns on every run. It is in the
`tsconfig.json` include list, so `pnpm typecheck` covers it.

The `@/*` alias is not redeclared for tests: `resolve.tsconfigPaths` makes Vite
read it straight out of `tsconfig.json`, so the paths live in one place. This
replaced the `vite-tsconfig-paths` plugin, which Vite now supports natively.

Tests sit beside the code they cover — `src/lib/i18n.ts` next to
`src/lib/i18n.test.ts` — rather than in a mirrored `__tests__` tree. Moving a
module moves its test with it.

## What is worth testing here

The site is mostly static marketing copy rendered by server components, so the
honest answer is: less than a typical app, and the tests that exist should be
the ones that can actually fail.

Worth it:

- **Pure logic.** `isLocale` is the guard on the `[locale]` route segment. It
  should reject `zh-CN` rather than quietly widening to `zh`, because `/zh-CN`
  is a 404.
- **Accessible semantics.** `LocaleSwitch` marks the current language with
  `aria-current` and names its `nav`. That is a contract with screen readers,
  invisible to a passing build and easy to break in a refactor.
- **Anything with a branch in it.** If it has an `if`, it has a case worth
  pinning.

Not worth it:

- **What the types already prove.** `SiteContent` is a `Record<Locale, …>`, so a
  locale missing a section fails to compile. A test comparing key sets between
  locales can never fail — it is dead weight.
- **Tailwind class names.** Asserting `toHaveClass("bg-muted")` breaks on every
  design change and says nothing about what a user perceives.
- **Framework behaviour.** Next's router and Base UI's primitives ship their own
  suites.

## The server component limitation

Testing Library renders a **synchronous** server component fine — `LocaleSwitch`
is one, and it is tested for real. An **`async` server component cannot be
rendered by Vitest**. There is no workaround worth having: do not make a
component a client component just to test it. Pull the logic out into a plain
function, test that, and let the build verify the rendering.

`next/link` renders in jsdom without a mock.

## Where tests run

`pre-commit` runs Biome on staged files only — no tests, so committing stays
fast. CI runs `pnpm test` between typecheck and build, and a failure fails the
build. Running the suite locally before calling work done is on you.
