# @linonward/web

To C Web application and article experience. Next.js 16 App Router, Tailwind CSS v4, TypeScript.
It is not a standalone administration app; protected routes within it also provide content
management and operational tooling.

Distinct from [`apps/www`](../www), which is the public bilingual website. This app is
single-language (`zh-CN`) and not indexed. Public routes render published articles from
[`apps/api`](../api); protected routes manage content and expose operational views.

The authenticated `/admin` route provides a ProseMirror-based article workbench backed by the
content API. It creates and updates drafts, and exposes publish and unpublish actions only when the
returned capability set permits them. The API also defines a separately authorized delete operation,
but the current management UI has no delete control. The editor accepts ordered, mount-time plugins
that can extend its schema, ProseMirror plugin stack, key bindings, toolbar, and lifecycle.
`/editor` is retained as a redirect to `/admin`.

## Run it

```bash
pnpm --filter @linonward/web dev     # http://localhost:3002
```

Port `3002` keeps it clear of `www` (3000) and `api` (3001), so all three run at once.

The public home, `/articles`, and `/articles/[id]` routes read published Chinese articles. In
development they show a local preview article if the API is unavailable or empty; production does
not. Successful API reads are revalidated every 60 seconds.

The protected status page calls the API's `GET /health`. With no configuration it targets
`http://localhost:3001`, the API's own default — point it elsewhere with
`NEXT_PUBLIC_API_URL` (see [`.env.example`](./.env.example)). The page renders either way:
an unreachable API is reported, not thrown.

Protected routes require a Better Auth session. `/login` supports a Resend-delivered email OTP and,
when enabled, Google OAuth. `next.config.ts` rewrites `/api/auth/*` to `apps/api`, keeping browser
requests and session cookies first-party. Set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` only when
the matching Google credentials are configured on the API. Follow the
[local administrator authentication guide](../../docs/local-authentication.md) to configure
PostgreSQL, Resend, both administrator allow-lists, migrations, and runtime verification.

`/observability` is administrator-only and reads Prometheus plus Tempo from the server. Override
`PROMETHEUS_URL`, `TEMPO_URL`, `GRAFANA_URL`, and `PROMETHEUS_PUBLIC_URL` when those services are
not on their local defaults. The page degrades to a visible offline state and refreshes every 30
seconds.

## Layout

```
apps/web/
├── src/app/
│   ├── layout.tsx           # root layout — metadata, fonts, globals.css
│   ├── page.tsx             # / — published article landing page
│   ├── articles/            # public article index and ID-addressed detail
│   ├── login/page.tsx       # /login — email OTP + optional Google OAuth
│   ├── admin/page.tsx       # /admin — persistent article workbench
│   ├── editor/page.tsx      # /editor — redirects to /admin
│   ├── components/page.tsx  # /components — design-system catalogue
│   ├── observability/page.tsx # /observability — Prometheus + Tempo
│   ├── status/page.tsx      # /status — reads GET /health
│   ├── unauthorized/page.tsx # /unauthorized — signed in without access
│   ├── design-tokens.generated.css # generated cross-platform tokens
│   └── globals.css          # Tailwind v4 semantic mapping and app styles
├── src/components/articles/ # public article rendering
├── src/components/site/     # app shell
├── src/components/editor/   # ProseMirror schema, editor boundary and workbench
├── src/components/ui/       # Base UI-backed shadcn primitives
└── src/lib/                 # auth, capabilities, articles, health and observability
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm --filter @linonward/web dev` | Dev server on 3002 |
| `pnpm --filter @linonward/web build` | Production build |
| `pnpm --filter @linonward/web test` | Vitest |
| `pnpm --filter @linonward/web test:watch` | Vitest in watch mode |
| `pnpm --filter @linonward/web test:e2e` | Playwright authentication journey |
| `pnpm --filter @linonward/web typecheck` | `next typegen` then `tsc --noEmit` |

Playwright verifies that an unauthenticated browser is redirected from `/admin` to `/login`.
Broader routing, internationalization, responsive navigation, and contact-form journeys remain in
`apps/www`.

## Notes

- Design tokens are generated from the cross-platform source
  [`design/tokens.json`](../../design/tokens.json). Run `pnpm design-tokens:generate` after changing
  it; do not hand-edit `src/app/design-tokens.generated.css`.
- `components.json` configures the same Base UI-backed shadcn style as `apps/www`; run the CLI from
  `apps/web` so generated components use this app's aliases and CSS entry point.
- `typedRoutes` is on, so `next typegen` has to run before `tsc` — bare `tsc` stops
  validating `href` silently. That is why `typecheck` is two commands.
