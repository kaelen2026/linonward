# Development

## Setup

```bash
corepack enable          # pins pnpm to the version in package.json
pnpm install             # also installs the git hooks via `prepare`
```

Node 24 is required. With nvm: `nvm use` picks up `.nvmrc`.

## Everyday commands

```bash
pnpm dev                             # all JavaScript apps except the Feishu relay
pnpm --filter @linonward/www dev     # just the website        (3000)
pnpm --filter @linonward/api dev     # backend API             (3001)
pnpm --filter @linonward/web dev     # internal console        (3002)
pnpm --filter @linonward/h5 dev      # native article reader   (3003)
pnpm dev:feishu                      # Feishu relay (requires apps/feishu/.env)
pnpm build
pnpm typecheck
pnpm test                            # architecture boundaries + workspace Vitest
pnpm test:e2e                        # Playwright, against a production build
pnpm lint                            # check only
pnpm lint:fix                        # apply safe fixes
pnpm db:generate                     # generate SQL after a Drizzle schema change
pnpm db:check                        # validate Drizzle migration snapshots
pnpm db:studio                       # inspect DATABASE_URL with Drizzle Studio
pnpm android:lint                    # Android Lint, warnings are errors
pnpm android:test                    # Android JVM unit tests, no emulator
pnpm android:build                   # Android debug APK
```

The `android:*` and `ios:*` scripts shell out to Gradle and Xcode. HarmonyOS uses
`scripts/harmony-ci.sh` directly. All three native apps are outside the Turborepo graph, so
`pnpm build` and `pnpm test` do not cover them. Platform requirements and API-origin contracts
live in each app's README.

Testing has its own page: [testing.md](./testing.md).

Turborepo caches `build`, `typecheck`, and `test`. A second run with no changes
replays from cache in milliseconds. Force a fresh run with `--force`:

```bash
pnpm build --force
```

## Changing the database

All tables and relations live in `packages/db/src/schema`. Edit them there, run
`pnpm db:generate`, review the generated SQL under `packages/db/migrations/drizzle`, then run
`pnpm db:check`. Apply it locally through the API migration entry point; it runs the retained
legacy migrations first and Drizzle migrations second:

```bash
DATABASE_URL=postgres://linonward:linonward@localhost:5432/linonward \
  pnpm --filter @linonward/api migrate
```

## Adding a shadcn/ui component

Run the CLI from inside the app so it reads that app's `components.json`:

```bash
cd apps/www
pnpm dlx shadcn@latest add dialog
```

Components land in `src/components/ui/` and are yours to edit — there is no
upstream version to keep in sync.

## Adding a new app

This describes a JavaScript workspace. A native app — `apps/ios`, `apps/android`, or
`apps/harmony` — deliberately
carries no `package.json`, stays out of the Turborepo graph, and gets root `<platform>:*` scripts
where useful, or a platform-specific script such as `scripts/harmony-ci.sh`, plus its own CI job.

1. `mkdir -p apps/<name>` and add a `package.json` named `@linonward/<name>`.
2. Give it `dev`, `build`, and `typecheck` scripts so it joins the task graph.
3. Extend a shared tsconfig:
   `{ "extends": "@linonward/typescript-config/nextjs.json" }`
   and add `"@linonward/typescript-config": "workspace:*"` to `devDependencies`.
4. `pnpm install` to link it.

## Adding a shared package

Same steps under `packages/`, then depend on it from an app with
`"@linonward/<name>": "workspace:*"`. For a package that ships built output,
add a `build` script and list its outputs in `turbo.json`.

## Troubleshooting

**A dependency's install script was skipped.** pnpm blocks postinstall scripts
unless allowlisted. Add the package to `onlyBuiltDependencies` in
`pnpm-workspace.yaml` and reinstall.

**Turborepo served a stale result.** Run with `--force`, or `rm -rf .turbo`.
