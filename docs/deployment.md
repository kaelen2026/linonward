# Deployment

## Runtime inventory

The repository produces four server runtimes plus one static H5 artifact. `packages/db` is built
code consumed by the API, not a separately deployed service.

| Runtime | Artifact / command | State and external dependencies |
| --- | --- | --- |
| `apps/www` | `.next/`; `pnpm --filter @linonward/www start` | Stateless; browser calls `apps/api` directly |
| `apps/web` | `.next/`; `pnpm --filter @linonward/web start` | Stateless; server and auth proxy call `apps/api` |
| `apps/api` | `dist/`; `pnpm --filter @linonward/api start` | PostgreSQL and Redis are mandatory in production |
| `apps/feishu` | `dist/`; `pnpm --filter @linonward/feishu start` | PostgreSQL outbox, Redis, and outbound Feishu/GitHub access |
| `apps/h5` | `dist/`; host as static files or bundle with native | No server state; communicates with its native host through the reader bridge |

Build everything from the repository root with `pnpm build`, or build one deployable with its
filtered command. The API build automatically builds `@linonward/db` first through both its
`prebuild` script and the Turborepo dependency graph.

The H5 build uses relative asset paths and a restrictive CSP, so the same `dist/` can live below a
URL prefix or inside a native bundle. iOS release builds require an explicit HTTPS
`LINONWARD_ARTICLE_READER_URL`; the development default is `http://localhost:3003/`.

## Public website and internal console

Both frontend apps are standard Next.js server builds and require Node.js 24. They are separate
deployments: `www` serves the bilingual public site on port 3000 by default, while `web` serves
the authenticated internal console on port 3002.

`NEXT_PUBLIC_API_URL` is inlined by `next build` in both apps. Set it for the target environment
at build time; changing it after the build does not retarget an existing artifact. For `www`, add
the deployed site origin to the API's `CORS_ALLOWED_ORIGINS`, because the contact form calls the
API from the visitor's browser. `web` rewrites `/api/auth/*` to the same API origin so session
cookies stay first-party.

For a managed Next.js platform such as Vercel, create one project per frontend app and select the
corresponding app directory. Installation still has to run against the pnpm workspace, with files
outside that app directory available. Use the filtered build command for that app:

```bash
pnpm --filter @linonward/www build
pnpm --filter @linonward/web build
```

The repository does not currently enable Next.js `output: "standalone"` and does not contain
frontend Dockerfiles. A self-hosted container therefore needs either the full production
workspace installation, or an explicit standalone-output change plus an image that copies the
standalone server, static assets, and `apps/www/public` where applicable.

## API

[`apps/api/Dockerfile`](../apps/api/Dockerfile) is the production image definition. The root
[`compose.yml`](../compose.yml) is the local reference topology: API, PostgreSQL 18, and Redis 8,
with the API waiting for both health checks. Run migrations as the separate one-shot deployment
service before starting application replicas:

```text
docker compose --profile migrate run --rm migrate
```

The migration process uses a single database connection and holds one advisory lock across both
the legacy and Drizzle histories. See [Operations and governance](./operations.md) for the
expand/contract policy and recovery controls.

In production, `NODE_ENV=production` makes the API reject missing PostgreSQL, Redis, Better Auth,
or Resend configuration instead of silently selecting in-memory adapters or omitting
authentication. In local development, authentication is mounted only when its complete
configuration and `DATABASE_URL` are present. Review
[`apps/api/.env.example`](../apps/api/.env.example) and the security notes in
[`apps/api/README.md`](../apps/api/README.md) before deploying.

When the API sits behind a proxy, list only controlled literal socket peers in
`TRUSTED_PROXY_IPS`, and configure each proxy to overwrite or append `X-Forwarded-For`. Readiness
is available at `GET /health/ready`; liveness at `GET /health` deliberately touches no dependency.

## Feishu relay

The relay is not an HTTP service and exposes no port. Redis claims each delivery before dispatch,
so it is safe against retries and replica overlap. It owns the Feishu long connection and dispatches normal messages to the `linonward-bot` GitHub
Actions workflow. Its standalone Compose definition is
[`apps/feishu/compose.yml`](../apps/feishu/compose.yml), with setup and live verification in
[`apps/feishu/README.md`](../apps/feishu/README.md).

If the optional Hermes route is enabled, Hermes remains bound to loopback on the host. The relay
container reaches it through `host.docker.internal`; do not expose that API publicly or configure
Hermes as a second Feishu gateway.

## CI gate

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every push to `main` and every
pull request, regardless of its base. Its jobs run in parallel.

`verify` runs:

```bash
pnpm install --frozen-lockfile
pnpm exec commitlint --from <base> --to <head>   # pull requests only
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`e2e` installs Chromium and runs `pnpm test:e2e` against the production `apps/www` build. The
browser cache is keyed by the resolved Playwright version; system dependencies are still installed
on cache hits. The HTML report uploads on every non-cancelled run and is retained for seven days.

`integration` starts PostgreSQL and Redis service containers, applies the complete migration
history to an empty database, and runs the production adapter contracts against both services.

`ios` regenerates the Xcode project, confirms the checked-in project is current, then builds and
tests the iOS app on macOS.

`android` runs lint, JVM tests, debug and release builds on Ubuntu, then runs the framework-dependent
suite on an Android emulator. The release artifact uses a non-deployable HTTPS API origin unless CI
is explicitly given another one.

`harmony` runs lint, a build, and host tests on a repository-owned macOS runner with the proprietary
SDK when `HARMONY_CI_ENABLED` is true. Fork pull requests never execute on that runner. Device tests
remain a separately dispatched workflow because they require attached hardware; if the repository
variable is disabled, a green hosted CI run does not cover HarmonyOS.

pnpm comes from `pnpm/action-setup`, which reads `packageManager`; Node comes from `.nvmrc`. A new
push cancels an in-flight pull-request run, but pushes to `main` are not cancelled.

### Remote caching

CI already passes optional `TURBO_TOKEN` and `TURBO_TEAM` values. Turborepo uses a cold local cache
when they are absent. To enable remote caching, link the repository to the cache provider, add
`TURBO_TOKEN` as a repository secret, and add `TURBO_TEAM` as a repository variable. Fork pull
requests cannot read the secret and therefore build without the remote cache.
