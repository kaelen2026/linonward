import { applyDrizzleMigrations, connectDatabase, migrationDirectories } from "@linonward/db";

import { loadApiConfig } from "./config.js";
import { migrate, withMigrationLock } from "./shared/migrate.js";

const config = loadApiConfig(process.env);

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations");
}

const directories = migrationDirectories();
// Session-level advisory locks only protect work performed on their owning
// connection. A one-connection pool keeps both migration systems on it.
const postgres = connectDatabase(config.databaseUrl, { maxConnections: 1 });

try {
  const applied = await withMigrationLock(postgres.sql, async () => {
    const legacy = await migrate(postgres.sql, directories.legacy);
    await applyDrizzleMigrations(postgres.db, directories.drizzle);
    return legacy;
  });
  console.log(
    applied.length > 0
      ? `Applied legacy migrations: ${applied.join(", ")}; Drizzle migrations are up to date`
      : "Legacy and Drizzle migrations are up to date",
  );
} finally {
  await postgres.close();
}
