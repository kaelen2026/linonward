# Architecture

## Workspaces

`pnpm-workspace.yaml` declares two globs: `apps/*` and `packages/*`.

| Workspace | Package name | Role |
| --- | --- | --- |
| `apps/android` | — | Native Jetpack Compose application. Gradle build, outside the pnpm task graph. |
| `apps/api` | `@linonward/api` | Backend HTTP API. Hono, laid out as a modular monolith. |
| `apps/feishu` | `@linonward/feishu` | Feishu event relay. Routes authorized text to a GitHub Actions `workflow_dispatch` or local Hermes. |
| `apps/h5` | `@linonward/h5` | Vite + React article reader embedded in native WebViews. |
| `apps/harmony` | — | Native ArkTS application for HarmonyOS. DevEco Studio project, outside the pnpm task graph. |
| `apps/ios` | — | Native SwiftUI application. XcodeGen project, outside the pnpm task graph. |
| `apps/web` | `@linonward/web` | Internal console. Next.js 16 App Router, Tailwind CSS v4. Reads `apps/api`. |
| `apps/www` | `@linonward/www` | Official website. Next.js 16 App Router, Tailwind CSS v4, shadcn/ui. |
| `packages/contracts` | `@linonward/contracts` | Shared HTTP DTOs, field limits, and runtime response schemas. |
| `packages/db` | `@linonward/db` | Backend database boundary: Drizzle schema, relations, client, and migrations. |
| `packages/typescript-config` | `@linonward/typescript-config` | Shared `tsconfig` presets consumed via `extends`. |

Internal packages are referenced with the `workspace:*` protocol, so pnpm links
them from disk instead of resolving them from the registry.

`apps/ios`, `apps/android`, and `apps/harmony` are colocated under `apps/` but have no
`package.json`, so pnpm does not treat them as workspace packages. Root `ios:*` scripts invoke
XcodeGen and Xcode directly, `android:*` scripts invoke the checked-in Gradle wrapper, and
`apps/harmony` is driven by DevEco Studio and its hvigor wrapper. Turbo continues to own only the
JavaScript and TypeScript task graph. None of the native apps appears in `pnpm build` or
`pnpm test`, so each needs separate verification.

The `.ets` and `.json5` files in the native projects are unknown extensions to Biome, which
`files.ignoreUnknown` skips. The `.json` resource files and the two `hvigorfile.ts` entries are
not — Biome formats those like any other file in the repo.

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

`^build` means "build every dependency of this workspace first". The API builds
`@linonward/db` and `@linonward/contracts` first; both Next apps build the contracts package
before their own tasks. Configuration-only packages without a `build` script do not add a task
to that chain.

Lint and format are *not* Turborepo tasks. Biome is a single fast binary that
walks the whole repo in one pass, so running it from the root is cheaper than
scheduling one process per workspace.

## `apps/www`

```
apps/www/
├── src/
│   ├── app/
│   │   ├── [locale]/   # the root layout and page; every route is locale-prefixed
│   │   └── globals.css # Tailwind v4 theme and global component utilities
│   ├── components/
│   │   ├── site/       # site-specific sections and interactive components
│   │   └── ui/         # shadcn/ui primitives (owned in-repo, safe to edit)
│   ├── content/site.ts # typed Chinese and English copy
│   └── lib/            # locale, inquiry, API URL, and class-name helpers
├── e2e/                # Playwright journeys
├── components.json     # shadcn/ui CLI config
├── next.config.ts
├── postcss.config.mjs  # @tailwindcss/postcss
└── tsconfig.json       # extends @linonward/typescript-config/nextjs.json
```

Tailwind v4 has no `tailwind.config.js`. `src/app/globals.css` has a static brand ramp in
`@theme`, semantic tokens in `:root` plus a `prefers-color-scheme: dark` media query, and an
`@theme inline` bridge that exposes them to Tailwind. There is no `.dark` class or theme toggle.
The locale layout publishes `--font-geist-sans` and `--font-geist-mono`; the theme layer builds
`--font-sans` and `--font-mono` from those variables and appends the CJK fallback stack.

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

## `apps/ios`

The native client is a Swift 6 SwiftUI application targeting iOS 26 on iPhone and iPad. XcodeGen's
`project.yml` is the source of truth, while the generated `LinOnward.xcodeproj` stays checked in so
the app opens directly in Xcode. Shared build settings live in `Config/`; app composition, design
primitives, feature code, localized resources, and UI tests remain in separate directories.

The app has one `NavigationStack`, with authentication and the H5 article reader composed at the
root. Authentication owns its state, URLSession boundary, and Keychain token store; the reader owns
its locked-down `WKWebView` and negotiated bridge. The app stays on the HTTP side of `apps/api` and
never imports `packages/db` or backend implementation files.

Authentication is the one feature that crosses that boundary today: an email one-time code, and —
where the build carries a Google client — Google. The app authenticates with `Authorization:
Bearer` rather than cookies, and runs Google's authorization-code-with-PKCE flow itself before
handing the id token to `POST /api/auth/sign-in/social`, because Better Auth's browser redirect
can only return to an `https` origin.

## `apps/android`

The Android client is a Kotlin Jetpack Compose application, `minSdk` 26, compiled and targeted
against Android 37. Gradle is the source of truth and the wrapper is checked in, so the app builds
without Android Studio and CI verifies the wrapper's checksum. Versions live in one catalog,
`gradle/libs.versions.toml`.

```
apps/android/app/src/main/kotlin/com/linonward/app/
├── app/            # MainActivity and the root composition
├── designsystem/   # the brand ramp, the Material 3 scheme, shared components
└── feature/        # feature-first screens and state
```

It deliberately mirrors `apps/ios` rather than inventing a second architecture: the same sign-in
flow, the same one-origin-per-build contract, the same rule that all flow logic lives in a plain
value — here `AuthenticationState` — so it is covered by JVM tests that need no emulator. There is
no navigation library, no repository layer and no dependency-injection framework; the app has one
axis, signed in or not, and those boundaries belong with the first behaviour that needs them.

Two departures from the iOS app are intentional. **Google sign-in is not implemented**: the
equivalent flow is Custom Tabs with PKCE and its own OAuth client, and it should arrive as its own
change rather than as a button that always fails. **Material You dynamic colour is off**: the
palette is the brand ramp shared with `apps/www`, and repainting it from the device wallpaper would
discard the identity it exists to carry.

The API origin arrives as a `BuildConfig` field from a Gradle property, empty in release for the
same reason the iOS xcconfig ships it empty. Debug points at `10.0.2.2:3001`, the emulator's alias
for the host loopback, and `res/xml/network_security_config.xml` permits cleartext for that address
alone. Details are in [the app README](../apps/android/README.md).

## `apps/harmony`

The HarmonyOS client is a stage-model ArkTS application targeting API 12 on phone, tablet, and
2-in-1. The tracked `build-profile.template.json5` is the reviewed project profile;
`scripts/prepare-harmony-profile.sh` creates the ignored machine-local `build-profile.json5`.
The module profile under `entry/` remains tracked. DevEco Studio recreates the project `hvigorw`
wrapper and `.hvigor/` on sync.

```
apps/harmony/
├── AppScope/                        # bundle identity, app label, app icon
└── entry/src/
    ├── main/ets/{config,designsystem,entryability,entrybackupability,pages}/
    ├── main/resources/              # base (English fallback), zh_CN, dark, media, profiles
    ├── test/                        # hypium unit tests, host only
    └── ohosTest/                    # hypium + UiTest, needs a device
```

Two things carry over from `apps/ios` on purpose. The API origin is a build-time constant, one
per build — here `arkOptions.buildProfileFields` in `entry/build-profile.json5`, compiled into the
generated `BuildProfile` class, debug at `localhost:3001` and release deliberately empty. And the
logic worth testing is kept out of the UI: `config/ApiEndpoint.ets` is pure so `entry/src/test`
covers it without a device, while `config/ApiConfiguration.ets` is the thin layer that knows
`BuildProfile` exists.

Color resources mirror the two-layer scheme in `apps/www`: semantic names in
`resources/base/element/color.json`, flipped by `resources/dark/element/color.json` on the system
dark color mode.

GitHub-hosted runners carry no HarmonyOS SDK. When `HARMONY_CI_ENABLED=true`, changed HarmonyOS
paths run lint, an unsigned build, and host tests on a repository-owned self-hosted macOS runner;
fork pull requests are excluded. A separate scheduled/manual workflow runs device tests on a
runner with attached hardware. When that variable or those runners are unavailable, verification
remains a documented local step rather than part of a green hosted run.

The shell is one page with no router, no view-model layer, and no HTTP client; authentication is
the largest gap against `apps/ios`. When it is added, the app stays on the HTTP side of `apps/api`
and never imports `packages/db` or backend implementation files.

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
└── modules/
    ├── auth/       # Better Auth handler, email OTP delivery, optional Google OAuth
    ├── contact/    # inquiry routes, service, and storage adapters
    └── health/     # liveness and dependency readiness
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

The root `compose.yml` runs the three containers together; migrations owned by `packages/db` are
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
generated into `migrations/drizzle`. The migration executable uses a one-connection pool and holds
one session-level advisory lock across both histories, so concurrent replica startups cannot run
the Drizzle half after the legacy lock has already been released.

Content mutations also write `content_audit_events`. Success records share the article transaction,
while failure records are inserted after rollback. Audit rows intentionally retain scalar actor and
target identifiers instead of foreign keys, preserving operational evidence when mutable records
are later removed.

`content_role_assignments` binds the bounded `administrator` and `editor` content roles to Better
Auth user IDs. Authorization remains server-side: the API returns capabilities for the current
session, and `apps/web` uses them to shape the editor while every mutation is independently checked
again by the API. The configured administrator email list is a bootstrap path rather than the
long-term role store.

Article content and publication state use separate application commands. Create and update accept
only draft fields and preserve server-owned status; publish and unpublish have dedicated endpoints,
capability checks, and audit actions. This prevents a generic update DTO from acquiring lifecycle
transitions as the publishing workflow evolves.

## `packages/contracts`

`@linonward/contracts` owns data that crosses the HTTP boundary: DTO types, stable field limits,
runtime request and response schemas, and the application-owned OpenAPI document. It deliberately
contains no database tables, Hono routes, React components, or service behavior. The API remains
authoritative, while clients validate what arrived over the network instead of trusting a
TypeScript assertion. Subpath exports keep browser bundles independent: contact, content, health,
and session consumers load only their own contract.

The root architecture test enforces two dependency rules: client workspaces cannot import
`@linonward/db`, and the contracts package cannot import storage, HTTP, Next.js, or React runtime
code. API module isolation remains independently enforced by `apps/api/src/modules/boundaries.test.ts`.
The cross-platform capability and compatibility lifecycle is recorded in
[`capabilities.md`](./capabilities.md).

## `apps/h5`

`apps/h5` is a Vite + React article surface, not a standalone content backend. Native sends
sanitized article data and reader settings through a versioned bridge; H5 reports readiness,
rendered height, link taps, image taps, and validation errors back to its host. The handshake
negotiates a protocol minor version and capability intersection, then binds every later message to
a random page `sessionId` so stale or cross-page messages are rejected.

The production build uses relative asset paths and a restrictive Content Security Policy, so it
can be hosted below a URL prefix or bundled into a native client. iOS currently embeds it in a
locked-down `WKWebView`; Android and HarmonyOS support are planned. The full message contract and
transport order live in [the app README](../apps/h5/README.md).

## `apps/web`

`apps/web` is the internal console and article publication surface: a second Next.js 16 App Router
app, single-language (`zh-CN`), `noindex`, served on port 3002 so it can run alongside `www`
(3000) and `api` (3001). Its public routes read published content; protected routes manage the
article lifecycle and read health, Prometheus metrics, and Tempo traces.

```
apps/web/
├── src/app/
│   ├── layout.tsx           # root layout — metadata, globals.css
│   ├── page.tsx             # /
│   ├── login/page.tsx       # /login — Better Auth email OTP / Google
│   ├── articles/             # published article index and detail pages
│   ├── admin/page.tsx        # capability-shaped article management
│   ├── observability/page.tsx # Prometheus and Tempo operational view
│   ├── status/page.tsx      # /status — GET /health, force-dynamic
│   ├── design-tokens.generated.css # generated cross-platform tokens
│   └── globals.css          # Tailwind v4 semantic mapping and app styles
├── src/components/editor/   # ProseMirror schema, plugins, toolbar, persistence UI
├── src/components/site/     # app shell
└── src/lib/                 # auth, capabilities, article API, health and observability
```

Better Auth runs inside Hono and stores users, accounts, sessions, and OTP verification records
in Postgres through Drizzle ORM. Email OTP delivery uses Resend; Google OAuth is optional. Web
proxies `/api/auth/*` to Hono so browser cookies remain first-party, while protected Server
Components forward the cookie to `GET /api/auth/get-session` before rendering.

The content API returns roles and fine-grained capabilities. Server Components use those
capabilities to shape the management UI, while the API independently authorizes every create,
update, publish, unpublish, and delete command. Public article reads are cached for 60 seconds;
development alone supplies a preview article when the API is unavailable or empty.

It carries no shadcn/ui registry and no Playwright suite — end-to-end coverage stays on
`www`, the app with routing and crawler-visible output worth a browser. Its CSS tokens are
generated from the same cross-platform `design/tokens.json` source as www and the native clients.
Details in
[the app README](../apps/web/README.md).

## `apps/feishu`

`apps/feishu` is a Node.js long-connection client. It authenticates with Feishu using the app ID
and secret, accepts text messages only from configured open IDs, and owns the only Bot connection.
Normal text invokes the unified `linonward-bot` workflow through GitHub Actions
`workflow_dispatch`; `/内容` and `/content` requests go to an optional loopback-only Hermes API.
Topics map to stable sessions on either route. Redis atomically claims message IDs for 24 hours,
which makes delivery retries safe across process restarts and replicas. It needs no public callback
URL. Deployment and environment configuration live in [the app README](../apps/feishu/README.md).

## TypeScript

`packages/typescript-config/base.json` is strict: `strict`, `isolatedModules`,
`noUncheckedIndexedAccess`, and `verbatimModuleSyntax` are all on. `nextjs.json`
layers on the bundler resolution and JSX settings Next.js expects.
