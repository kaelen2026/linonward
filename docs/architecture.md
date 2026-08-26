# Architecture

## Workspaces

`pnpm-workspace.yaml` declares two globs: `apps/*` and `packages/*`.

| Workspace | Package name | Role |
| --- | --- | --- |
| `apps/feishu` | `@linonward/feishu` | Feishu event relay. Validates an authorized text message and emits a GitHub `repository_dispatch`. |
| `apps/www` | `@linonward/www` | Official website. Next.js 16 App Router, Tailwind CSS v4, shadcn/ui. |
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

## `apps/feishu`

`apps/feishu` is a Node.js long-connection client. It authenticates with Feishu using the app ID
and secret, accepts text messages only from configured open IDs, and dispatches `feishu-task` to
GitHub. It needs no public callback URL. Deployment and environment configuration live in
[the app README](../apps/feishu/README.md).

## TypeScript

`packages/typescript-config/base.json` is strict: `strict`, `isolatedModules`,
`noUncheckedIndexedAccess`, and `verbatimModuleSyntax` are all on. `nextjs.json`
layers on the bundler resolution and JSX settings Next.js expects.
