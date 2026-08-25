# Deployment

## Build

```bash
pnpm build                            # every workspace
pnpm --filter @linonward/www build    # website only
```

Output is a standard `.next/` build in `apps/www`. Serve it with
`pnpm --filter @linonward/www start`.

## Vercel

Point the project at this repository and set:

| Setting | Value |
| --- | --- |
| Root Directory | `apps/www` |
| Framework Preset | Next.js |
| Build Command | `cd ../.. && pnpm --filter @linonward/www build` |
| Install Command | `pnpm install` |
| Node.js Version | 24.x |

Enable **Include files outside the root directory** so the workspace packages
are available at build time.

## Docker / self-hosted

Add `output: "standalone"` to `apps/www/next.config.ts`, then copy
`.next/standalone`, `.next/static`, and `public/` into the runtime image and
start it with `node server.js`.

## CI

A minimal pipeline:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build
```

Turborepo's remote cache makes these near-instant across runs — connect one
with `npx turbo login && npx turbo link`, then expose `TURBO_TOKEN` and
`TURBO_TEAM` to CI.
