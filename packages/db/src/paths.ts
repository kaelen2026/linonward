import { fileURLToPath } from "node:url";

export function migrationDirectories(): { drizzle: string; legacy: string } {
  const root = new URL("../migrations/", import.meta.url);
  return {
    drizzle: fileURLToPath(new URL("drizzle", root)),
    legacy: fileURLToPath(new URL("legacy", root)),
  };
}
