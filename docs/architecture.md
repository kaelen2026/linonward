# Architecture

## Workspaces

`pnpm-workspace.yaml` declares two globs: `apps/*` and `packages/*`.

| Workspace | Package name | Role |
| --- | --- | --- |
| `apps/api` | `@linonward/api` | Backend HTTP API. Hono, laid out as a modular monolith. |
| `apps/feishu` | `@linonward/feishu` | Feishu event relay. Validates an authorized text message and emits a GitHub `repository_dispatch`. |
| `apps/web` | `@linonward/web` | Internal console. Next.js 16 App Router, Tailwind CSS v4. Reads `apps/api`. |
| `apps/www` | `@linonward/www` | Official website. Next.js 16 App Router, Tailwind CSS v4, shadcn/ui. |
| `packages/db` | `@linonward/db` | Backend database boundary: Drizzle schema, relations, client, and migrations. |
| `packages/typescript-config` | `@linonward/typescript-config` | Shared `tsconfig` presets consumed via `extends`. |

Internal packages are referenced with the `workspace:*` protocol, so pnpm links
them from disk instead of resolving them from the registry.

## Turborepo task graph

`turbo.json` defines the tasks the root scripts fan out to:

| Task | Depends on | Cached | Notes |
| --- | --- | --- | --- |
| `build` | `^build` | yes | Outputs `.next/**` (minus cache) and `dist/**` |
| `dev` | — | no | `persistent: true`, long-running |
| `start` | `build` | no | `persistent: true` |
| `typecheck` | `^build` | yes | No outputs; the cache stores the pass/fail result |
| `test` | `^build` | yes | Vitest; same deal — the cache stores the result |
| `test:e2e` | `build` | no | Playwright; needs this workspace's own build to serve |
| `clean` | — | no | |

`^build` means "build every dependency of this workspace first". Because
`@linonward/www` depends on `@linonward/typescript-config`, Turborepo orders
them correctly without any manual wiring.

Lint and format are *not* Turborepo tasks. Biome is a single fast binary that
walks the whole repo in one pass, so running it from the root is cheaper than
scheduling one process per workspace.

## `apps/www`

```
apps/www/
├── src/
│   ├── app/            # App Router: layout.tsx, page.tsx, globals.css
│   ├── components/ui/  # shadcn/ui components (owned in-repo, safe to edit)
│   └── lib/utils.ts    # cn() — clsx + tailwind-merge
├── components.json     # shadcn/ui CLI config
├── next.config.ts
├── postcss.config.mjs  # @tailwindcss/postcss
└── tsconfig.json       # extends @linonward/typescript-config/nextjs.json
```

Tailwind v4 has no `tailwind.config.js`. Theme tokens live in
`src/app/globals.css` inside `@theme inline`, backed by CSS custom properties
in `:root` and `.dark`. Fonts are wired by naming the `next/font` CSS variables
`--font-sans` and `--font-mono` on `<html>`, which is exactly what the theme
block reads.

### The one write path

The site is otherwise static; the contact form in the closing section is the only
thing that sends data anywhere. It posts to `apps/api`'s `POST /contact/inquiries`
**straight from the browser**, not through a Next route handler — the API's rate
limiter keys on the client address, so a server-side hop would collapse every
visitor into one budget and let a single submitter spend the whole site's. That is
what `CORS_ALLOWED_ORIGINS` on the API and `NEXT_PUBLIC_API_URL` here are: the two
sides of one handshake.

`src/lib/inquiry.ts` mirrors the API's zod schema so a mistake is caught before a
request is spent, and deliberately is not a second source of truth — the server
revalidates and wins, and a disagreement surfaces as `invalid` on the field the
server named. The mailto link below the form stays as the fallback for when the
API is down. Contact data is write-only at the public boundary; a future internal
reader must add authentication rather than re-expose this endpoint.

## `apps/api`

A Hono service on Node, structured as a **modular monolith**: one process and one deployable,
with the internal seams a service split would have given, minus the network hop.

```
apps/api/src/
├── index.ts        # config → app → listen
├── composition.ts  # the mount table; where the real clock, ids, and storage are chosen
├── app.ts          # request id, CORS, and the one error envelope
├── migrate.ts      # applies @linonward/db migrations, then exits
├── shared/         # the shared kernel: ApiError, module/database contracts, Redis
└── modules/        # health/ and contact/, each a vertical routes → service → repository slice
```

Three rules hold it together: a module is a vertical slice; a module imports only itself and
`src/shared`; a module exposes exactly one function, `create<Name>Module(deps): ApiModule`. The
first is a layout convention, but the second is a *fitness function* —
`src/modules/boundaries.test.ts` walks the sources and fails the build on a cross-module import,
naming the file and the specifier. Anything shared between modules goes through `composition.ts`
instead, which is what keeps a later extraction cheap.

Dependencies are injected rather than reached for (`clock`, `nextId`, `repository`), so modules
test without a socket or a database. Postgres backs inquiries and Redis backs the submission rate
limit, but `composition.ts` is the only file that knows either exists: modules see an
`InquiryRepository` and a `RateLimiter` and cannot tell which adapter they were handed. Both are
optional locally — absent, the in-memory adapters take over — and both are refused under
`NODE_ENV=production`, so no deploy can quietly lose its data to a restart.

`apps/api/compose.yml` runs the three containers together; migrations owned by `packages/db` are
applied by `dist/migrate.js` before the server starts. Endpoints, the error body, and configuration live in
[the app README](../apps/api/README.md).

## `packages/db`

`@linonward/db` is backend infrastructure, not a frontend data-access layer. It owns the single
`postgres.js` pool factory, the typed Drizzle client, every Postgres table and relation, and the
migration history. `apps/api` consumes it through `workspace:*`; `apps/web` and `apps/www` still
cross the HTTP boundary and never import it.

Current tables are split by domain under `src/schema/`, then composed once in `schema/index.ts`.
Drizzle Kit reads that same object, preventing runtime queries and migration generation from
drifting onto separate definitions. Existing idempotent migrations remain in `migrations/legacy`;
the no-op Drizzle `0000` baseline captures their resulting schema, and all future changes are
generated into `migrations/drizzle`.

## `apps/web`

`apps/web` is the internal console: a second Next.js 16 App Router app, single-language
(`zh-CN`), `noindex`, served on port 3002 so it can run alongside `www` (3000) and `api`
(3001). It reads operational data from `apps/api`; authentication is its only write path.

```
apps/web/
├── src/app/
│   ├── layout.tsx           # root layout — metadata, globals.css
│   ├── page.tsx             # /
│   ├── login/page.tsx       # /login — Better Auth email OTP / Google
│   ├── status/page.tsx      # /status — GET /health, force-dynamic
│   └── globals.css          # Tailwind v4, a subset of the brand tokens
├── src/components/site/     # app shell
└── src/lib/                 # auth client/session, API origin, health fetch, cn()
```

Better Auth runs inside Hono and stores users, accounts, sessions, and OTP verification records
in Postgres through Drizzle ORM. Email OTP delivery uses Resend; Google OAuth is optional. Web
proxies `/api/auth/*` to Hono so browser cookies remain first-party, while protected Server
Components forward the cookie to `GET /api/auth/get-session` before rendering.

It carries no shadcn/ui registry and no Playwright suite — end-to-end coverage stays on
`www`, the app with routing and crawler-visible output worth a browser. Its design tokens
are a deliberate subset of www's; a third consumer is the point to extract a shared
package instead of copying the ramp again. Details in
[the app README](../apps/web/README.md).

## `apps/feishu`

`apps/feishu` is a Node.js long-connection client. It authenticates with Feishu using the app ID
and secret, accepts text messages only from configured open IDs, and dispatches the unified
`linonward-bot` GitHub Actions workflow. It needs no public callback URL. Deployment and environment configuration live in
[the app README](../apps/feishu/README.md).

## TypeScript

`packages/typescript-config/base.json` is strict: `strict`, `isolatedModules`,
`noUncheckedIndexedAccess`, and `verbatimModuleSyntax` are all on. `nextjs.json`
layers on the bundler resolution and JSX settings Next.js expects.
