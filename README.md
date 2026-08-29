# Linonward

Turborepo monorepo powered by a pnpm workspace.

## Requirements

- Node.js `>= 24` (see `.nvmrc`)
- pnpm `11.19.0` (pinned via `packageManager`; run `corepack enable`)
- Xcode 26+ and XcodeGen 2.46+ for `apps/ios`
- JDK 17 and an Android SDK with platform 37 for `apps/android`
- DevEco Studio 5.0.5+ and HarmonyOS SDK API 12+ for `apps/harmony`

## Getting started

```bash
pnpm install
pnpm --filter @linonward/www dev
```

The website runs at http://localhost:3000, the API at http://localhost:3001, the
internal console at http://localhost:3002, and the H5 reader at http://localhost:3003. The
command above starts only the website; run `pnpm dev` for every JavaScript app except the Feishu
relay, or start the API separately when exercising the contact form.
The optional Grafana profile also defaults to port 3003; when running it beside H5, set
`GRAFANA_PORT=3004` and `GRAFANA_URL=http://localhost:3004`.
The API is a Hono modular monolith; see [`apps/api/README.md`](./apps/api/README.md).
Those defaults line up, so the site's contact form reaches the API with no `.env` at
all — point it elsewhere with `NEXT_PUBLIC_API_URL` (see
[`apps/www/.env.example`](./apps/www/.env.example)).
The Feishu long-connection client requires its own environment configuration; see
[`apps/feishu/README.md`](./apps/feishu/README.md).
All three native clients build outside pnpm and Turborepo: `apps/ios` through XcodeGen and Xcode,
`apps/android` through Gradle, and `apps/harmony` through DevEco Studio or HarmonyOS Command Line
Tools. HarmonyOS verification runs only when the repository's self-hosted runner is enabled; see
[`apps/harmony/README.md`](./apps/harmony/README.md).

## Workspace layout

```
.
├── apps/
│   ├── android/                # Native Jetpack Compose application
│   ├── api/                    # Backend — Hono modular monolith, Postgres + Redis
│   ├── feishu/                 # Feishu-to-GitHub task relay
│   ├── h5/                     # React article reader embedded by native clients
│   ├── harmony/                # Native ArkTS application for HarmonyOS
│   ├── ios/                    # Native SwiftUI application for iPhone and iPad
│   ├── web/                    # Internal console — Next.js 16 App Router
│   └── www/                    # Official website — Next.js App Router
├── packages/
│   ├── contracts/              # Shared HTTP DTOs, limits, and runtime response schemas
│   ├── db/                     # Drizzle schema, relations, client, migrations
│   └── typescript-config/      # Shared tsconfig presets
├── docs/                       # Project documentation
├── compose.yml                # Local Postgres, Redis, and API orchestration
├── biome.json                  # Lint + format
├── turbo.json                  # Task graph
└── pnpm-workspace.yaml
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run every JavaScript app except the Feishu relay in dev mode |
| `pnpm dev:feishu` | Run the Feishu relay after configuring its environment |
| `pnpm build` | Build every workspace |
| `pnpm typecheck` | Type-check every workspace |
| `pnpm test` | Run architecture boundaries, then workspace Vitest suites |
| `pnpm test:e2e` | Run Playwright end-to-end against a production build |
| `pnpm ios:generate` | Regenerate the Xcode project from `apps/ios/project.yml` |
| `pnpm ios:build` | Build the SwiftUI app for a generic iOS Simulator |
| `pnpm ios:test` | Run iOS UI tests on an available iPhone Simulator |
| `pnpm android:lint` | Run Android Lint over `apps/android` |
| `pnpm android:test` | Run the Android JVM unit tests |
| `pnpm android:build` | Build the Android debug APK |
| `pnpm db:generate` | Generate a migration after changing `packages/db/src/schema` |
| `pnpm db:check` | Validate the Drizzle migration snapshots |
| `pnpm db:studio` | Open Drizzle Studio against `DATABASE_URL` |
| `pnpm infra:up` | Start local PostgreSQL and Redis containers |
| `pnpm infra:down` | Stop the local Compose stack |
| `pnpm infra:status` | Show local PostgreSQL and Redis container status |
| `pnpm infra:logs` | Follow local PostgreSQL and Redis logs |
| `pnpm lint` | Biome lint + format check |
| `pnpm lint:fix` | Biome autofix |
| `pnpm format` | Biome format only |
| `pnpm clean` | Remove build output and `node_modules` |

Target a single workspace with `--filter`:

```bash
pnpm --filter @linonward/www dev
pnpm --filter @linonward/web dev
pnpm --filter @linonward/api dev
pnpm --filter @linonward/feishu dev
```

Start only the shared local infrastructure from the repository root:

```bash
docker compose up -d postgres redis
```

## Documentation

See [`docs/`](./docs) — start with [docs/README.md](./docs/README.md).
