import { applyDrizzleMigrations, connectDatabase, migrationDirectories } from "@linonward/db";

import { loadApiConfig } from "./config.js";
import { migrate } from "./shared/migrate.js";

const config = loadApiConfig(process.env);

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations");
}

const directories = migrationDirectories();
const postgres = connectDatabase(config.databaseUrl);

try {
  const applied = await migrate(postgres.sql, directories.legacy);
  await applyDrizzleMigrations(postgres.db, directories.drizzle);
  console.log(
    applied.length > 0
      ? `Applied legacy migrations: ${applied.join(", ")}; Drizzle migrations are up to date`
      : "Legacy and Drizzle migrations are up to date",
  );
} finally {
  await postgres.close();
}
