# @linonward/web

Internal console. Next.js 16 App Router, Tailwind CSS v4, TypeScript.

Distinct from [`apps/www`](../www), which is the public bilingual website. This app is
single-language (`zh-CN`), not indexed, and exists to authenticate against and read from
[`apps/api`](../api).

The authenticated `/editor` route provides a reusable ProseMirror-based rich-text editor. Its
toolbar covers headings, emphasis, quotes, lists, and history while the document remains structured
JSON ready for a future API contract; this first capability intentionally adds no persistence. The
editor accepts ordered, mount-time plugins that can extend its schema, ProseMirror plugin stack,
key bindings, toolbar, and lifecycle. `src/components/editor/highlight-plugin.ts` is a working
example.

## Run it

```bash
pnpm --filter @linonward/web dev     # http://localhost:3002
```

Port `3002` keeps it clear of `www` (3000) and `api` (3001), so all three run at once.

The status page calls the API's `GET /health`. With no configuration it targets
`http://localhost:3001`, the API's own default — point it elsewhere with
`NEXT_PUBLIC_API_URL` (see [`.env.example`](./.env.example)). The page renders either way:
an unreachable API is reported, not thrown.

The console requires a Better Auth session. `/login` supports a Resend-delivered email OTP and,
when enabled, Google OAuth. `next.config.ts` rewrites `/api/auth/*` to `apps/api`, keeping browser
requests and session cookies first-party. Set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` only when
the matching Google credentials are configured on the API.

## Layout

```
apps/web/
├── src/app/
│   ├── layout.tsx           # root layout — metadata, fonts, globals.css
│   ├── page.tsx             # /
│   ├── login/page.tsx       # /login — email OTP + optional Google OAuth
│   ├── editor/page.tsx      # /editor — ProseMirror rich-text workbench
│   ├── status/page.tsx      # /status — reads GET /health
│   └── globals.css          # Tailwind v4 + a small slice of the brand tokens
├── src/components/site/     # app shell
├── src/components/editor/   # ProseMirror schema, editor boundary and workbench
└── src/lib/                 # auth client/session, API origin, health fetch, cn()
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm --filter @linonward/web dev` | Dev server on 3002 |
| `pnpm --filter @linonward/web build` | Production build |
| `pnpm --filter @linonward/web test` | Vitest |
| `pnpm --filter @linonward/web test:watch` | Vitest in watch mode |
| `pnpm --filter @linonward/web typecheck` | `next typegen` then `tsc --noEmit` |

No Playwright here — end-to-end coverage stays on `apps/www`, which is the app with
routing, redirects and crawler-visible output worth driving a browser for.

## Notes

- Design tokens are a subset of the system documented in
  [docs/design-system.md](../../docs/design-system.md); the full ramp lives in
  `apps/www/src/app/globals.css`. A third consumer is the point to extract a shared
  package rather than copy it again.
- `typedRoutes` is on, so `next typegen` has to run before `tsc` — bare `tsc` stops
  validating `href` silently. That is why `typecheck` is two commands.
