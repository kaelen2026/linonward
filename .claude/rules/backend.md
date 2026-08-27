---
paths:
  - "apps/api/**/*"
  - "apps/feishu/**/*"
  - "packages/db/**/*"
---

# Backend rules

These rules apply to the Hono API, the Feishu integration worker, and the shared database package.

## Boundaries and composition

- Keep `apps/api` a modular monolith. A module imports only itself and `src/shared`, and exposes one
  `create<Name>Module(deps): ApiModule` entry point. Do not bypass
  `src/modules/boundaries.test.ts` with aliases, dynamic imports, or re-exports.
- Choose concrete repositories, clocks, identifiers, databases, Redis clients, and remote adapters
  in `apps/api/src/composition.ts`. Domain services receive narrow interfaces and do not construct
  infrastructure clients themselves.
- Put genuinely cross-module contracts in `src/shared`; coordinate modules through composition.
  Do not turn `shared` into a dumping ground for one module's implementation details.
- Frontends cross the HTTP boundary. They must not import `packages/db` or backend source files.

## HTTP and configuration

- Validate request params, query strings, headers, and bodies before they reach domain behavior.
  Return errors through the API's existing envelope rather than inventing route-specific shapes.
- Preserve request IDs, CORS, client-address handling, authentication, and rate limiting when adding
  routes. Authorization is required before exposing stored contact or account data.
- Read configuration through the workspace's validated config module. Keep secrets server-only,
  update `.env.example` and the workspace README for new variables, and never commit a real `.env`.
- Keep production fail-closed behavior: required persistent dependencies must not silently fall back
  to in-memory adapters in production.

## Database and migrations

- `packages/db` owns the Drizzle client, schema, relations, and migrations. Export additions through
  its public entry point instead of importing its private source tree from consumers.
- Generate a new migration with the repository script after changing schema. Inspect the SQL and
  run `pnpm db:check`; do not rewrite legacy or already-applied migrations.
- Treat destructive or irreversible migration steps as explicit user decisions. Prefer staged,
  backwards-compatible changes when deployments may run old and new application versions together.
- Keep database access behind repositories at the API boundary. Tests should use injected fakes
  unless the behavior specifically requires PostgreSQL semantics.

## Integrations and reliability

- Assume Feishu, GitHub, email, and other remote calls can time out, fail, retry, or deliver the same
  event more than once. Preserve idempotency and stable session behavior where the existing flow
  provides it.
- Keep vendor payloads and clients at adapter boundaries. Domain logic should consume validated,
  minimal values rather than SDK response objects.
- Do not send live messages, dispatch workflows, run live migrations, or mutate production services
  during verification unless the user explicitly authorizes that external effect.

## Verification

- Follow `.claude/rules/tdd.md` for behavior changes and `.claude/rules/typescript.md` for strict
  typing and module rules.
- Run focused tests first, then the affected workspace's test, typecheck, and build commands. Before
  handoff run root `pnpm lint`, `pnpm typecheck`, and `pnpm test`; add `pnpm build` for build-affecting
  changes and `pnpm db:check` for schema or migration work.
