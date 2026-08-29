import { randomUUID } from "node:crypto";

import {
  articles,
  connectDatabase,
  contentAuditEvents,
  contentRoleAssignments,
  user,
} from "@linonward/db";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../../app.js";
import { createContentModule } from "./index.js";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("content role integration", () => {
  const postgres = connectDatabase(databaseUrl ?? "");
  let actorEmail: string;
  let articleIds: string[];
  let userId: string;

  afterAll(async () => {
    await postgres.close();
  });

  beforeEach(async () => {
    const suffix = randomUUID();
    actorEmail = `editor-${suffix}@example.com`;
    articleIds = [];
    userId = `user_${suffix}`;
    await postgres.db.insert(user).values({
      id: userId,
      name: "Editor",
      email: actorEmail,
      emailVerified: true,
    });
    await postgres.db.insert(contentRoleAssignments).values({
      userId,
      role: "editor",
      assignedByEmail: "operator@linonward.com",
    });
  });

  afterEach(async () => {
    await postgres.db
      .delete(contentAuditEvents)
      .where(eq(contentAuditEvents.actorEmail, actorEmail));
    for (const articleId of articleIds) {
      await postgres.db.delete(articles).where(eq(articles.id, articleId));
    }
    await postgres.db.delete(user).where(eq(user.id, userId));
  });

  const app = () =>
    createApp({
      allowedOrigins: [],
      modules: [
        createContentModule({
          database: postgres.db,
          authenticate: async () => ({ user: { id: userId, email: actorEmail, name: "Editor" } }),
          administratorEmails: [],
          clock: () => new Date("2026-08-29T12:00:00.000Z"),
          nextId: () => {
            const id = `art_${randomUUID()}`;
            articleIds.push(id);
            return id;
          },
          nextAuditId: () => `audit_${randomUUID()}`,
        }),
      ],
    });

  const input = (status: "draft" | "published") => ({
    title: "Role-scoped article",
    slug: `role-scoped-${randomUUID()}`,
    excerpt: "An article used to verify content roles.",
    content: { type: "doc" },
    coverImageUrl: null,
    locale: "en",
    status,
    authorName: "Editor",
    seoDescription: "Role-scoped article",
  });

  it("lets an assigned editor create drafts and audits refused publication", async () => {
    const draft = await app().request("/api/content/admin/articles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input("draft")),
    });
    expect(draft.status).toBe(201);

    const publication = await app().request("/api/content/admin/articles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input("published")),
    });
    expect(publication.status).toBe(403);

    const events = await postgres.db
      .select({ outcome: contentAuditEvents.outcome, errorCode: contentAuditEvents.errorCode })
      .from(contentAuditEvents)
      .where(eq(contentAuditEvents.actorEmail, actorEmail));
    expect(events).toEqual(
      expect.arrayContaining([
        { outcome: "success", errorCode: null },
        { outcome: "failure", errorCode: "forbidden" },
      ]),
    );
  });
});
