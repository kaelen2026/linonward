---
name: database-engineering
description: Design, implement, review, and verify LinOnward PostgreSQL and Drizzle changes. Use for schemas, constraints, indexes, query plans, repositories, transactions, concurrency, pagination, data backfills, and migrations in packages/db or database-backed API adapters.
---

# Engineer database changes

Protect data first, then optimize measured access paths. Keep PostgreSQL and Drizzle details behind repository boundaries so domain services remain deterministic and testable.

## Establish the data contract

1. Read `packages/db/README.md`, the affected schema, migration history, repository port and contract tests, and every query that uses the data.
2. State required invariants, cardinality, ownership, retention, expected volume, write rate, read patterns, ordering, and concurrent behavior. Do not derive the public contract from the current table layout.
3. Choose database constraints for invariants that must hold across every writer. Application validation improves errors but cannot replace `NOT NULL`, uniqueness, foreign keys, or appropriate checks.

## Shape schemas and queries

1. Use precise PostgreSQL types, explicit nullability, stable identifiers, timezone-aware timestamps, and deliberate delete behavior. Avoid storing structured relationships in opaque JSON without a concrete need.
2. Design indexes from actual predicates, joins, and ordering. For composite indexes, align leading columns with equality filters and subsequent columns with range and sort requirements. Do not add speculative indexes; every index increases write and maintenance cost.
3. Use deterministic ordering with a unique tie-breaker. Prefer keyset pagination for large or changing collections and define the cursor against the exact filters and ordering.
4. Keep transactions short and make the isolation or locking requirement explicit. Use atomic SQL or constraints instead of check-then-write races. Define retry behavior for serialization, deadlock, and uniqueness conflicts.
5. Inspect representative plans with `EXPLAIN (ANALYZE, BUFFERS)` when query performance matters. Test realistic selectivity and data volume; a plan over an empty development table is not evidence.

## Evolve safely

1. Treat deployed schema and migration history as immutable. Generate a new Drizzle migration; never rewrite `migrations/legacy` or an applied migration.
2. Prefer expand-migrate-contract when old and new application versions may overlap: add compatible structures, deploy dual-compatible code, backfill in bounded resumable batches, then remove obsolete structures in a later release.
3. Avoid long table rewrites and blocking operations on large tables. Separate adding nullable storage, backfilling, validating, and enforcing `NOT NULL` when necessary.
4. Make destructive changes, irreversible conversions, data loss, and production backfills explicit user decisions. A generated migration is not automatically a safe migration.
5. Keep schema, relations, public exports, migration snapshots, adapters, and tests synchronized.

## Implement through repositories

1. Extend the module-owned repository port around domain operations, not generic database access. Only the PostgreSQL adapter should know Drizzle or SQL exists.
2. Preserve equivalent observable behavior between in-memory and PostgreSQL adapters where both exist. Run the same contract suite against each, adding PostgreSQL-specific tests only for behavior that requires real database semantics.
3. Do not return database rows blindly. Map persistence records to domain or wire types and avoid exposing internal columns.

## Verify and report

1. Run focused repository and schema tests, then `pnpm db:generate` for schema changes and inspect every generated SQL statement.
2. Run `pnpm db:check`, the affected workspace tests and typecheck, and a real PostgreSQL integration test when relying on constraints, transactions, indexes, or database-specific behavior.
3. Run the repository verification required by `implement-backend`. Report query-plan evidence, migration and rollback or forward-fix strategy, backfill needs, and any production behavior not exercised.
