# Linonward

Turborepo monorepo powered by a pnpm workspace.

## Requirements

- Node.js `>= 24` (see `.nvmrc`)
- pnpm `11.19.0` (pinned via `packageManager`; run `corepack enable`)

## Getting started

```bash
pnpm install
pnpm --filter @linonward/www dev
```

The website runs at http://localhost:3000 and the API at http://localhost:3001.
The API is a Hono modular monolith; see [`apps/api/README.md`](./apps/api/README.md).
The Feishu long-connection client requires its own environment configuration; see
[`apps/feishu/README.md`](./apps/feishu/README.md).

## Workspace layout

```
.
├── apps/
│   ├── api/                    # Backend — Hono modular monolith
│   ├── feishu/                 # Feishu-to-GitHub task relay
│   └── www/                    # Official website — Next.js App Router
├── packages/
│   └── typescript-config/      # Shared tsconfig presets
├── docs/                       # Project documentation
├── biome.json                  # Lint + format
├── turbo.json                  # Task graph
└── pnpm-workspace.yaml
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run every app in dev mode via Turborepo |
| `pnpm build` | Build every workspace |
| `pnpm typecheck` | Type-check every workspace |
| `pnpm test` | Run Vitest across every workspace |
| `pnpm test:e2e` | Run Playwright end-to-end against a production build |
| `pnpm lint` | Biome lint + format check |
| `pnpm lint:fix` | Biome autofix |
| `pnpm format` | Biome format only |
| `pnpm clean` | Remove build output and `node_modules` |

Target a single workspace with `--filter`:

```bash
pnpm --filter @linonward/www dev
pnpm --filter @linonward/api dev
pnpm --filter @linonward/feishu dev
```

## Documentation

See [`docs/`](./docs) — start with [docs/README.md](./docs/README.md).
