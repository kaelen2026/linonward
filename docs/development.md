# Development

## Setup

```bash
corepack enable          # pins pnpm to the version in package.json
pnpm install             # also installs the git hooks via `prepare`
```

Node 24 is required. With nvm: `nvm use` picks up `.nvmrc`.

## Everyday commands

```bash
pnpm dev                             # all apps
pnpm --filter @linonward/www dev     # just the website
pnpm build
pnpm typecheck
pnpm test                            # Vitest, every workspace
pnpm test:e2e                        # Playwright, against a production build
pnpm lint                            # check only
pnpm lint:fix                        # apply safe fixes
```

Testing has its own page: [testing.md](./testing.md).

Turborepo caches `build`, `typecheck`, and `test`. A second run with no changes
replays from cache in milliseconds. Force a fresh run with `--force`:

```bash
pnpm build --force
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
