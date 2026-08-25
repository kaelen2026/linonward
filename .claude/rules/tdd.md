# TDD rules

Operating rules for writing tests in this repository. Style reference for humans
lives in [docs/testing.md](../../docs/testing.md); this file is what the agent
follows. Git rules are in [git.md](./git.md).

## The loop

Test first, in a watcher, one behaviour at a time:

```bash
pnpm --filter @linonward/www test:watch
```

1. **Red** — write the failing test and *run it*. Read the failure message and
   check it fails for the reason you intended. A test that passes the moment you
   write it is testing nothing; so is one failing on a typo in the import.
2. **Green** — the least code that makes it pass. Not the general solution, not
   the next three cases you can already see.
3. **Refactor** — with the test green, clean up. Green stays green the whole way
   or you undo the last step.

Never write the implementation first and the test after to match it: a test
written against code you just wrote encodes the bug along with the behaviour.
If the code already exists and has no test, write the test, break the code on
purpose, watch the test fail, then restore it. That is the only way to know the
test is wired to anything.

## What to test

Test **observable behaviour** — what a caller or a user can see:

- Pure logic: `isLocale` accepts the locales the site ships and rejects `zh-CN`.
- Accessible semantics: `aria-current` marks the active language; a `nav` is
  reachable by its accessible name; a link points where it claims to.
- Contracts other code depends on: routes, hrefs, exported shapes, error paths.

Look at `src/lib/i18n.test.ts` and `src/components/site/locale-switch.test.tsx`
for the shape. One behaviour per `it`, and name it after the behaviour — "tells
assistive tech which language is showing", not "LocaleSwitch renders".

## What not to test

- **Anything the type system already guarantees.** `SiteContent` is a
  `Record<Locale, …>`, so a locale missing a section fails to compile. A test
  asserting both locales have the same keys is dead weight that can never fail.
- **Tailwind class strings.** `expect(el).toHaveClass("bg-muted")` breaks on
  every design tweak and proves nothing about what the user sees. Assert roles,
  names, and attributes instead.
- **Framework internals.** Next's router, Base UI's primitives, and Biome all
  have their own suites.
- **Snapshots of whole components.** They pass by being updated. Ban unless the
  user asks for one.

## React Server Components

Testing Library renders a *synchronous* server component fine — `LocaleSwitch`
is one, and its test is real. An **`async` server component cannot be rendered
by Vitest at all**; do not try, and do not convert a component to a client
component just to make it testable. Cover the logic inside it by extracting the
logic, and leave the rendering to the build.

`next/link` renders in jsdom without a mock. If a Next API genuinely needs one,
mock the module, not the whole framework, and say why in a comment.

## Layout and naming

Tests sit next to the code they cover, not in a mirror tree:

```
src/lib/i18n.ts
src/lib/i18n.test.ts
src/components/site/locale-switch.tsx
src/components/site/locale-switch.test.tsx
```

Only `src/**/*.test.{ts,tsx}` is collected. `vitest.config.mts` and
`vitest.setup.ts` live at the app root; the setup file loads
`@testing-library/jest-dom` matchers and runs `cleanup` after each test, so
tests do not need to do either.

## Commands

| Command | Use |
| --- | --- |
| `pnpm test` | Every workspace, through Turborepo. What CI runs. |
| `pnpm --filter @linonward/www test` | One workspace, once. |
| `pnpm --filter @linonward/www test:watch` | The TDD loop. |
| `pnpm --filter @linonward/www exec vitest run src/lib/i18n.test.ts` | One file. |
| `pnpm --filter @linonward/www exec vitest run -t "rejects an empty segment"` | One test by name. |

Turborepo caches `test`, so an unchanged workspace replays its result. When a
pass looks impossibly fast, it was cached — `--force` to actually run it. The
cache is shared across worktrees, so a stale pass can come from another one.

## Where tests run

The `pre-commit` hook does **not** run tests — only Biome on staged files, so
committing stays fast. CI is the gate: `pnpm test` runs there between typecheck
and build, and a red test fails the build.

That split means you own the loop locally. Run the suite before you say work is
done, and report the real output — `pnpm lint`, `pnpm typecheck`, `pnpm test`.

## When not to write a test

Writing the test is the default. Skip it, and say plainly that you skipped it,
only for: copy and content changes, styling with no behavioural component,
config and docs, and generated files. If you are unsure whether something is
behaviour, it is — write the test.
