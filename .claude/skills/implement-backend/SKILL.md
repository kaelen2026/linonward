---
name: implement-backend
description: Implement and verify backend changes in LinOnward's Hono API, Drizzle database package, or Feishu integration worker. Use for server modules, authentication, persistence, migrations, configuration, rate limiting, external-service adapters, and backend tests.
---

# Implement backend changes

## Establish scope

1. Identify the affected boundary: `apps/api`, `packages/db`, `apps/feishu`, or a deliberate combination.
2. Read the workspace README, package scripts, nearby implementation and tests, and any external contract the change crosses.
3. Inspect `git status` and preserve unrelated work, existing migration history, and generated output.

## Design the contract

1. Define observable success, validation failures, authorization rules, and dependency-failure behavior.
2. Decide which layer owns the change. API modules own domain behavior, `composition.ts` selects adapters, `packages/db` owns Postgres schema and migrations, and the Feishu worker owns relay orchestration.
3. Keep infrastructure behind narrow injected interfaces. Treat network payloads, environment variables, and persisted data as untrusted until validated.
4. Account for retries and duplicate delivery when an operation can be invoked more than once.

## Implement with tests

1. Follow `.claude/rules/tdd.md`: demonstrate a meaningful failing test before implementation when behavior changes.
2. Prefer service tests with injected dependencies for domain behavior; use route or composition tests for HTTP envelopes, middleware, and wiring.
3. Preserve module boundaries and public package entry points. Do not make one API module import another module's internals.
4. Generate a new Drizzle migration for schema changes. Never rewrite an applied migration or hand-edit generated snapshot metadata merely to make a check pass.
5. Make the smallest coherent change that satisfies the contract; avoid speculative shared abstractions.

## Verify

1. Run the narrowest affected Vitest file during the red-green-refactor loop.
2. Run the affected workspace's test, typecheck, and build commands. For database changes, also run `pnpm db:check` and inspect the generated SQL.
3. Run root `pnpm lint`, `pnpm typecheck`, and `pnpm test` before handoff.
4. Add root `pnpm build` for application code, dependencies, configuration, migrations, or other build-affecting changes.
5. Inspect the final diff for credentials, `.env` files, generated build output, destructive migration steps, and accidental cross-domain changes.

## Report

Describe the delivered behavior and contract changes, exact verification results, new configuration or migrations, and any external dependency not exercised. Do not commit, deploy, migrate a live database, or contact an external service unless the user explicitly requests it.
