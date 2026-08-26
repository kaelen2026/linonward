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
 * Applies every pending migration, each in its own transaction, and records it.
 * Small enough to read in one sitting, which is the point — a migration tool is
 * the last place to want a black box.
 */
export async function migrate(sql: Sql, directory: string): Promise<string[]> {
  await sql`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const recorded = await sql<{ name: string }[]>`select name from schema_migrations`;
  const pending = pendingMigrations(
    await readdir(directory),
    recorded.map((row) => row.name),
  );

  for (const name of pending) {
    const statements = await readFile(path.join(directory, name), "utf8");

    await sql.begin(async (tx) => {
      await tx.unsafe(statements);
      await tx`insert into schema_migrations ${tx({ name })}`;
    });
  }

  return pending;
}
