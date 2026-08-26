import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as authSchema from "../modules/auth/schema.js";

export type Sql = postgres.Sql;

export type PostgresConnection = {
  db: PostgresJsDatabase<typeof authSchema>;
  sql: Sql;
  ping(): Promise<void>;
  close(): Promise<void>;
};

export function connectPostgres(url: string): PostgresConnection {
  // postgres.js connects lazily, so this cannot fail here — `ping` is what a
  // readiness probe uses to find out whether the database is actually there.
  const sql = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: (notice) => {
      // `create … if not exists` reports 42P07 every time it skips, which is the
      // migration runner working as intended. Anything else is worth seeing.
      if (notice.code !== "42P07") {
        console.warn("Postgres notice", notice.message);
      }
    },
  });

  return {
    db: drizzle(sql, { schema: authSchema }),
    sql,
    async ping() {
      await sql`select 1`;
    },
    async close() {
      await sql.end();
    },
  };
}
