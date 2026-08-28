import type { Sql } from "@linonward/db";
import { describe, expect, it } from "vitest";

import { pendingMigrations, withMigrationLock } from "./migrate.js";

describe("pendingMigrations", () => {
  it("orders by the numeric prefix rather than by directory order", () => {
    expect(pendingMigrations(["010_c.sql", "002_b.sql", "001_a.sql"], [])).toEqual([
      "001_a.sql",
      "002_b.sql",
      "010_c.sql",
    ]);
  });

  it("skips what the database says it has already run", () => {
    expect(pendingMigrations(["001_a.sql", "002_b.sql"], ["001_a.sql"])).toEqual(["002_b.sql"]);
  });

  it("ignores files that are not migrations", () => {
    expect(pendingMigrations(["001_a.sql", "README.md", ".keep"], [])).toEqual(["001_a.sql"]);
  });

  it("has nothing to do when every migration is recorded", () => {
    expect(pendingMigrations(["001_a.sql"], ["001_a.sql"])).toEqual([]);
  });
});

describe("withMigrationLock", () => {
  it("holds one deployment lock around the complete migration sequence", async () => {
    const events: string[] = [];
    const sql = (() => {
      events.push(events.length === 0 ? "lock" : "unlock");
      return Promise.resolve([]);
    }) as unknown as Sql;

    await withMigrationLock(sql, async () => {
      events.push("legacy");
      events.push("drizzle");
    });

    expect(events).toEqual(["lock", "legacy", "drizzle", "unlock"]);
  });

  it("releases the deployment lock when a migration fails", async () => {
    const events: string[] = [];
    const sql = (() => {
      events.push(events.length === 0 ? "lock" : "unlock");
      return Promise.resolve([]);
    }) as unknown as Sql;

    await expect(
      withMigrationLock(sql, () => {
        events.push("migration");
        return Promise.reject(new Error("migration failed"));
      }),
    ).rejects.toThrow("migration failed");

    expect(events).toEqual(["lock", "migration", "unlock"]);
  });
});
