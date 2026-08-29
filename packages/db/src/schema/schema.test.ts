import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  account,
  accountRelations,
  articles,
  contentAuditEvents,
  inquiries,
  session,
  sessionRelations,
  user,
  userRelations,
  verification,
} from "./index.js";

describe("database schema", () => {
  it("keeps every deployed table in the central schema", () => {
    expect(
      [user, session, account, verification, inquiries, articles, contentAuditEvents].map(
        getTableName,
      ),
    ).toEqual([
      "user",
      "session",
      "account",
      "verification",
      "inquiries",
      "articles",
      "content_audit_events",
    ]);
  });

  it("indexes content audit investigations without coupling events to mutable records", () => {
    const config = getTableConfig(contentAuditEvents);
    expect(config.indexes).toHaveLength(3);
    expect(config.foreignKeys).toHaveLength(0);
  });

  it("indexes every foreign key used to join auth records", () => {
    expect(getTableConfig(session).indexes).toHaveLength(1);
    expect(getTableConfig(account).indexes).toHaveLength(1);
  });

  it("exports relations with the schema rather than rebuilding them in consumers", () => {
    expect([userRelations, sessionRelations, accountRelations]).not.toContain(undefined);
  });
});
