import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { schema } from "./schema/index.js";

export type Sql = postgres.Sql;
export type Database = PostgresJsDatabase<typeof schema>;

export type DatabaseConnection = {
  db: Database;
  sql: Sql;
  ping(): Promise<void>;
  close(): Promise<void>;
};

export type DatabaseConnectionOptions = {
  /** Keep at one when session-level state, such as an advisory lock, is used. */
  maxConnections?: number;
};

export function connectDatabase(
  url: string,
  { maxConnections = 10 }: DatabaseConnectionOptions = {},
): DatabaseConnection {
  const sql = postgres(url, {
    max: maxConnections,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: (notice) => {
      if (notice.code !== "42P07") console.warn("Postgres notice", notice.message);
    },
  });

  return {
    db: drizzle(sql, { schema }),
    sql,
    async ping() {
      await sql`select 1`;
    },
    async close() {
      await sql.end();
    },
  };
}

export async function applyDrizzleMigrations(
  database: Database,
  migrationsFolder: string,
): Promise<void> {
  await migrate(database, { migrationsFolder });
}
