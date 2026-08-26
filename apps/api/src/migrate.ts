import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadApiConfig } from "./config.js";
import { migrate } from "./shared/migrate.js";
import { connectPostgres } from "./shared/postgres.js";

const config = loadApiConfig(process.env);

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations");
}

// Resolved from this file so it works the same from `src` under tsx and from
// `dist` in the container; `migrations/` sits beside both.
const directory = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../migrations");
const postgres = connectPostgres(config.databaseUrl);

try {
  const applied = await migrate(postgres.sql, directory);
  console.log(applied.length > 0 ? `Applied: ${applied.join(", ")}` : "Already up to date");
} finally {
  await postgres.close();
}
