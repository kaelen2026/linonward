# API

The backend for [`apps/www`](../www), built with [Hono](https://hono.dev) and laid out as a
**modular monolith**: one process, one deployable — with hard internal seams so a module can be
extracted later without an archaeology project first.

## Why modular monolith

A microservice split buys independent deploys at the cost of network calls, distributed
transactions, and N pipelines. At this size none of that is earning its keep. What a split really
buys is *boundaries*, and boundaries are free — they only have to be enforced. So the boundaries
are here, and the network hop is not.

## Layout

```
src/
├── index.ts                 # process entry: config → app → listen
├── composition.ts           # the mount table and the real dependencies
├── app.ts                   # composition root: request id, CORS, error envelope
├── config.ts                # environment → ApiConfig
├── migrate.ts               # applies @linonward/db migrations, then exits
├── shared/                  # the shared kernel — the only thing modules may import
│   ├── api-error.ts         # ApiError + the one error body every failure uses
│   ├── migrate.ts           # the migration runner
│   ├── module.ts            # the ApiModule contract, AppEnv, mountModules
│   ├── database.ts          # module-safe exports from @linonward/db
│   ├── rate-limit.ts        # the RateLimiter port, in-memory adapter, middleware
│   └── redis.ts             # connection + the Redis RateLimiter adapter
└── modules/
    ├── boundaries.test.ts   # the fitness function that keeps modules apart
    ├── health/
    │   ├── index.ts         # the module's only public export: createHealthModule
    │   ├── routes.ts        # HTTP edge
    │   └── service.ts       # domain logic
    ├── auth/                # Better Auth handler and Resend OTP delivery
    ├── content/             # public reading, protected lifecycle, roles, audit
    └── contact/
        ├── index.ts         # createContactModule
        ├── routes.ts        # HTTP edge + zod validation
        ├── service.ts       # domain logic
        ├── repository.ts    # storage port + in-memory adapter
        ├── postgres-repository.ts  # the durable adapter
        └── schema.ts        # the wire contract
```

### The three rules

1. **A module is a vertical slice.** `routes → service → repository`, all in one directory. A
   feature is added in one folder, not spread across `controllers/`, `services/`, `models/`.
2. **A module imports only itself and `src/shared`.** Never another module's service, repository,
   or schema. `src/modules/boundaries.test.ts` walks the sources and fails the build on a
   violation, naming the file and the import — a convention nobody enforces is a convention
   nobody keeps.
3. **A module exposes exactly one thing:** `create<Name>Module(dependencies): ApiModule`. The
   composition root gets a name, a base path, and a router; it cannot reach past that.

Cross-module work therefore goes *through* `composition.ts` — today by handing both modules the
same dependency, later by an in-process event bus. It never goes through a direct import, which
is the coupling that makes a monolith impossible to split.

Time, ids, and storage are injected (`clock`, `nextId`, `repository`), so every module is
testable without a server, a clock, or a database. That is why the suite runs in about a second.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness, running version, uptime — touches no dependency |
| `GET` | `/health/ready` | Readiness; `200` ready, `503` degraded, naming what failed |
| `GET` | `/openapi.json` | OpenAPI 3.1 document for application-owned routes |
| `GET` | `/metrics` | Prometheus request counters, latency histogram, and active requests |
| `POST` | `/contact/inquiries` | Submit a contact-form inquiry |
| `GET` | `/api/content/articles` | List published articles, filtered by `locale=zh|en` |
| `GET` | `/api/content/articles/:slug` | Read one published article |
| `GET` | `/api/content/admin/access` | Return the current content roles and capabilities |
| `GET, POST` | `/api/content/admin/articles` | List all articles or create a draft |
| `PUT, DELETE` | `/api/content/admin/articles/:id` | Update or delete an article |
| `POST` | `/api/content/admin/articles/:id/publish` | Publish an article |
| `POST` | `/api/content/admin/articles/:id/unpublish` | Return an article to draft |
| `*` | `/api/auth/*` | Email OTP, Google OAuth, and session lifecycle |

The content module is mounted only when PostgreSQL is configured. Public reads expose published
rows only. Administrative routes authenticate through Better Auth and authorize against the
`administrator` and `editor` role assignments; the bootstrap administrator email list remains a
server-side override that grants the administrator role before database assignments are read.
Every authenticated mutation that reaches authorization records a success or failure audit event;
requests rejected before that boundary, such as an unauthenticated request, do not. A successful
mutation commits its audit row in the same database transaction.

Every failure — validation, unknown route, unexpected crash — uses one envelope:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "The inquiry is not valid",
    "requestId": "0f0a…",
    "details": [{ "path": "email", "message": "Invalid email address" }]
  }
}
```

`requestId` is also returned as `X-Request-Id`, so a user can quote it and an operator can find
the matching log line. An unexpected error is logged in full and answered with an opaque
`internal_error`; the original message never reaches the client.

## Postgres and Redis

Both are optional, and both are *required in production* — `loadApiConfig` refuses to start with
`NODE_ENV=production` and either one missing. That is the whole safety story: locally you get
zero-setup defaults, and the footgun (deploy, lose every inquiry to a restart) cannot reach a
real environment.

Authentication and inquiries use the typed Drizzle client from `@linonward/db` and share its
single `postgres.js` pool. The database package owns the `user`, `session`, `account`,
`verification`, and `inquiries` schemas and relations. Email OTPs are delivered by Resend, expire after ten
minutes, allow five attempts, and are stored as hashes. Google OAuth is optional.

| | `DATABASE_URL` set | unset |
| --- | --- | --- |
| Inquiries | `inquiries` table via Drizzle | a `Map`, gone on restart |

| | `REDIS_URL` set | unset |
| --- | --- | --- |
| Submission budget | one shared counter across replicas | per process, so N replicas get N budgets |

Rate limiting is a fixed window. Redis runs the increment, initial expiry, and TTL read as one
Lua script, so a failed round trip cannot leave an immortal counter. `POST /contact/inquiries`
is throttled *before* validation, so a flood costs a counter increment rather than a schema
parse. Inquiry data is write-only through this public API; reading it belongs
behind a future authenticated internal interface.

`composition.ts` is the only file that knows either technology exists. The modules see an
`InquiryRepository` and a `RateLimiter`, and cannot tell which adapter they were handed —
`repository.test.ts` runs one contract suite against both, so the durable adapter is held to the
same behaviour as the in-memory one.

### Migrations

Migrations live in [`packages/db`](../../packages/db). The API first applies retained legacy SQL
in filename order under one transaction-scoped advisory lock, then runs Drizzle migrations:

```bash
DATABASE_URL=postgres://linonward:linonward@localhost:5432/linonward \
  pnpm --filter @linonward/api migrate
```

Under Compose, run the one-shot `migrate` profile before starting or rolling application replicas:

```bash
docker compose --profile migrate run --rm migrate
```

The API container starts only `dist/index.js`; deployment ordering is therefore an operator or
platform responsibility rather than an implicit side effect of process startup.

After changing `packages/db/src/schema`, run `pnpm db:generate` and `pnpm db:check`; never hand-edit
a generated migration that has already been deployed.

## Run

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm --filter @linonward/api dev
```

With no `DATABASE_URL` or `REDIS_URL` this starts against in-memory adapters and needs no
containers. It logs which pair it chose at boot.

```bash
curl localhost:3001/health
curl -X POST localhost:3001/contact/inquiries \
  -H 'content-type: application/json' \
  -d '{"name":"林望","email":"lin@example.com","message":"想了解贵司的交付流程。","locale":"zh"}'
```

Production artifact:

```bash
pnpm --filter @linonward/api build
pnpm --filter @linonward/api start
```

## Run with Docker Compose

Brings up Postgres 18, Redis 8, and the API, with the app waiting on both healthchecks:

```bash
cp apps/api/.env.example apps/api/.env
docker compose --profile migrate run --rm migrate
docker compose up --build -d
curl localhost:3001/health/ready
docker compose down          # add -v to drop the data volume
```

Postgres keeps a named volume. Redis deliberately has none — rate-limit counters are disposable,
so it runs with persistence off and a 128 MB `allkeys-lru` ceiling rather than an unbounded
dataset.

## Configure

Every variable is optional; the defaults run locally as-is. See
[`.env.example`](./.env.example) for the full list. `CORS_ALLOWED_ORIGINS` takes bare origins —
an entry with a path is rejected at boot rather than silently never matching.
`TRUSTED_PROXY_IPS` is empty by default: only list literal socket peers controlled by your
deployment, and configure each proxy to overwrite or append `X-Forwarded-For`.

The caller that needs it is [`apps/www`](../www): its contact form posts here from the browser, so
the site's origin has to be listed. The other half of that handshake is `NEXT_PUBLIC_API_URL` in
[`apps/www/.env.example`](../www/.env.example) — change one and change the other.

For the internal console, `BETTER_AUTH_URL` is the browser-visible Web origin (locally
`http://localhost:3002`). Register `${BETTER_AUTH_URL}/api/auth/callback/google` as the Google
OAuth redirect URI. Web proxies `/api/auth/*` here so session cookies remain first-party.
For a complete local email-OTP setup and its verification commands, follow
[`docs/local-authentication.md`](../../docs/local-authentication.md).

`apps/ios` cannot use that client: Google refuses to redirect a *web* client to a custom URL
scheme, which is the only address a phone has. The app carries an **iOS** client of its own from
the same Google project, completes the flow itself, and posts the id token to
`/api/auth/sign-in/social`. Name that client in `GOOGLE_IOS_CLIENT_ID` and it becomes a second
accepted id-token audience — the browser flow stays on the web client, which is the one Better
Auth reads first. Leave it empty and Google sign-in works in the console and is refused from the
app. Same project means the same Google `sub`, so both routes land on one account.

## Test

```bash
pnpm --filter @linonward/api test
pnpm --filter @linonward/api test:watch
```

Vitest only; there is no browser to drive. Routes are exercised through `app.request()`, which
runs the real middleware stack without opening a socket.

The normal Vitest task skips infrastructure integration tests unless their URLs are set. CI runs a
separate integration job with fresh PostgreSQL and Redis service containers. To reproduce it:

```bash
docker compose up -d postgres redis
DATABASE_URL=postgres://linonward:linonward@localhost:5432/linonward \
REDIS_URL=redis://localhost:6379 \
  pnpm --filter @linonward/api test:integration
```
