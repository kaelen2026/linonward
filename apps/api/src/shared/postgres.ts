import postgres from "postgres";

export type Sql = postgres.Sql;

export type PostgresConnection = {
  sql: Sql;
  ping(): Promise<void>;
  close(): Promise<void>;
};

export function connectPostgres(url: string): PostgresConnection {
  // postgres.js connects lazily, so this cannot fail here — `ping` is what a
  // readiness probe uses to find out whether the database is actually there.
  const sql = postgres(url, { max: 10, idle_timeout: 20, connect_timeout: 10 });

  return {
    sql,
    async ping() {
      await sql`select 1`;
    },
    async close() {
      await sql.end();
    },
  };
}
