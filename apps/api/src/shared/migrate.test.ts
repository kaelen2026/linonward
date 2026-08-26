import { describe, expect, it } from "vitest";

import { pendingMigrations } from "./migrate.js";

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
