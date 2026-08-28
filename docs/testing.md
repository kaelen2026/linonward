# Testing

Two runners in `apps/www`: **Vitest** with Testing Library for logic and single
components, **Playwright** for end-to-end journeys against a production build.
This page is the human reference for how the setup works and why.

| | Vitest | Playwright |
| --- | --- | --- |
| Files | `src/**/*.test.{ts,tsx}` | `e2e/**/*.spec.ts` |
| Environment | jsdom | real Chromium, `next start` |
| Speed | milliseconds | seconds, plus a build |
| Cached by Turborepo | yes | no |
| Answers | "does this function/component behave?" | "does the built site work?" |

If jsdom can answer the question, it is not an E2E test.

`apps/api`, `apps/feishu`, `apps/web`, `packages/contracts`, and `packages/db` run Vitest only,
with tests beside the source they cover. The Node workspaces use Vitest's Node environment; both
Next apps use jsdom and Testing Library for components. Playwright stays on `apps/www` — it is the
app with routing, redirects and crawler-visible output worth the cost of a browser and a production
build on every run.

The two native apps run neither. `apps/ios` uses Swift Testing plus XCUITest through `pnpm
ios:test`, and `apps/android` runs JUnit on the JVM through `pnpm android:test`. Both follow the
same rule as the rest of the repository: the logic worth testing is pulled out of the UI layer —
`AuthenticationState` on both platforms — so the flow is covered without a simulator or an
emulator, and neither app appears in `pnpm test`.

## Running

```bash
pnpm test                                  # every workspace, via Turborepo — what CI runs
pnpm --filter @linonward/www test          # one workspace, once
pnpm --filter @linonward/www test:watch    # the TDD loop
pnpm --filter @linonward/api test:watch    # API TDD loop
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

The API suite normally uses its in-memory inquiry repository and rate limiter. Tests backed by
Postgres and Redis are skipped unless their URLs are present. CI runs them in a dedicated
integration job after applying all migrations to a fresh database. Locally, start the services
and pass both URLs to the filtered integration command:

```bash
DATABASE_URL=postgres://linonward:linonward@localhost:5432/linonward \
REDIS_URL=redis://localhost:6379 \
pnpm --filter @linonward/api test:integration
```

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

## End-to-end

```bash
pnpm test:e2e                                     # build, serve, drive Chromium
pnpm --filter @linonward/www test:e2e:ui          # the Playwright UI, for debugging
pnpm --filter @linonward/www exec playwright test e2e/i18n.spec.ts
pnpm --filter @linonward/www exec playwright test --project=mobile
```

Two projects run every spec: `desktop` (Desktop Chrome) and `mobile` (Pixel 7).
One engine, two viewports — for a static marketing site the real risk is the
responsive layout, not cross-engine differences. A spec that only makes sense at
one width skips itself with `test.skip(testInfo.project.name === "mobile", …)`.

Playwright serves the **production** build: `test:e2e` is a Turborepo task that
`dependsOn: ["build"]`, so `next start` has something to serve and the config
never rebuilds on its own. It is not cached — a green run proves the app worked,
not that the inputs matched. Locally, an already-running server on port 3100 is
reused; in CI it always starts fresh.

Before the first local run, fetch the browser once:

```bash
pnpm --filter @linonward/www exec playwright install chromium
```

### Scope every locator

The header and the footer both contain a nav *and* a language switcher, and both
navs carry the brand tagline as their accessible name. A bare
`getByRole("link", { name: "English" })` matches two elements and fails Playwright's
strict mode. Reach through the landmark instead:

```ts
page.getByRole("banner").getByRole("link", { name: localeLabels.en });
page.getByRole("contentinfo").getByRole("navigation", { name: tagline });
```

### What the specs cover

- `routing.spec.ts` — `/` redirects to `/zh`, each locale sets `<html lang>` and
  its own title, the hreflang set is complete (including `x-default`), and an
  unknown language 404s instead of guessing.
- `i18n.spec.ts` — switching language from either switcher, and `aria-current`
  marking the language on screen.
- `navigation.spec.ts` — the skip link under keyboard focus, every nav item
  resolving to a section that exists, anchor scrolling, the header nav following
  the `md` breakpoint while the footer nav stays reachable, and the contact CTA's
  prefilled `mailto:`.
- `contact-form.spec.ts` — the hydrated form rejects an empty draft without a request, and a
  completed form sends the expected cross-origin payload and renders the returned reference.

## Where tests run

`pre-commit` runs Biome on staged files only — no tests, so committing stays
fast. CI is the gate, in three parallel jobs: `verify` (lint, typecheck, Vitest,
build), `integration` (real Postgres, Redis, and migrations), and `e2e`
(Playwright). The browser binary is cached on its Playwright version, and the
HTML report uploads as an artifact on every run.

Running both suites locally before calling work done is on you.
