import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { Sql } from "./postgres.js";

/**
 * The migrations that still have to run, in filename order. Numeric prefixes
 * (`001_`, `002_`) are what makes that order meaningful.
 */
export function pendingMigrations(available: string[], applied: string[]): string[] {
  const done = new Set(applied);
  return available
    .filter((name) => name.endsWith(".sql"))
    .filter((name) => !done.has(name))
    .sort();
}

/**
 * Applies every pending migration and records it in one locked transaction.
 * Small enough to read in one sitting, which is the point — a migration tool is
 * the last place to want a black box.
 */
export async function migrate(sql: Sql, directory: string): Promise<string[]> {
  const available = await readdir(directory);

  return sql.begin(async (tx) => {
    // The transaction-scoped lock serialises migrations across replicas. It is
    // released automatically on rollback as well as commit.
    await tx`select pg_advisory_xact_lock(hashtext('linonward:schema-migrations'))`;
    await tx`
      create table if not exists schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `;

    const recorded = await tx<{ name: string }[]>`select name from schema_migrations`;
    const pending = pendingMigrations(
      available,
      recorded.map((row) => row.name),
    );

    for (const name of pending) {
      const statements = await readFile(path.join(directory, name), "utf8");
      await tx.unsafe(statements);
      await tx`insert into schema_migrations ${tx({ name })}`;
    }

    return pending;
  });
}
