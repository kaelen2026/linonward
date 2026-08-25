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

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every push to
`main` and every pull request against it. One `verify` job:

```bash
pnpm install --frozen-lockfile
pnpm exec commitlint --from <base> --to <head>   # pull requests only
pnpm lint
pnpm typecheck
pnpm build
```

pnpm comes from `pnpm/action-setup`, which reads the pinned version out of
`packageManager`; Node comes from `.nvmrc`. The pnpm store is cached by
`actions/setup-node`. A new push to a PR cancels the run still in flight.

The commitlint step is the backstop for the `commit-msg` hook, which a local
`--no-verify` can skip. It needs full history, hence `fetch-depth: 0`.

### Remote caching

The workflow already passes `TURBO_TOKEN` and `TURBO_TEAM` through; both are
optional, and Turborepo falls back to a cold local cache when they are unset. To
turn remote caching on, run `npx turbo login && npx turbo link`, then add
`TURBO_TOKEN` as a repository **secret** and `TURBO_TEAM` as a repository
**variable**. Fork pull requests cannot read secrets and will keep building cold.
