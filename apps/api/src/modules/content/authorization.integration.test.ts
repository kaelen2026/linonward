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

  const input = () => ({
    title: "Role-scoped article",
    slug: `role-scoped-${randomUUID()}`,
    excerpt: "An article used to verify content roles.",
    content: { type: "doc" },
    coverImageUrl: null,
    locale: "en",
    authorName: "Editor",
    seoDescription: "Role-scoped article",
  });

  it("lets an assigned editor create drafts and audits refused publication commands", async () => {
    const draft = await app().request("/api/content/admin/articles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input()),
    });
    expect(draft.status).toBe(201);

    const created = (await draft.json()) as { article: { id: string } };
    const publication = await app().request(
      `/api/content/admin/articles/${created.article.id}/publish`,
      {
        method: "POST",
      },
    );
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

  it("refuses editor updates to published articles and deletion", async () => {
    const articleId = `art_${randomUUID()}`;
    articleIds.push(articleId);
    const now = new Date("2026-08-29T11:00:00.000Z");
    await postgres.db.insert(articles).values({
      ...input(),
      status: "published",
      id: articleId,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const update = await app().request(`/api/content/admin/articles/${articleId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input()),
    });
    expect(update.status).toBe(403);

    const deletion = await app().request(`/api/content/admin/articles/${articleId}`, {
      method: "DELETE",
    });
    expect(deletion.status).toBe(403);

    const events = await postgres.db
      .select({ action: contentAuditEvents.action, outcome: contentAuditEvents.outcome })
      .from(contentAuditEvents)
      .where(eq(contentAuditEvents.actorEmail, actorEmail));
    expect(events).toEqual(
      expect.arrayContaining([
        { action: "article.update", outcome: "failure" },
        { action: "article.delete", outcome: "failure" },
      ]),
    );
  });

  it("publishes and unpublishes through explicit administrator commands", async () => {
    await postgres.db
      .delete(contentRoleAssignments)
      .where(eq(contentRoleAssignments.userId, userId));
    await postgres.db.insert(contentRoleAssignments).values({
      userId,
      role: "administrator",
      assignedByEmail: "operator@linonward.com",
    });
    const createdResponse = await app().request("/api/content/admin/articles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...input(), status: "published" }),
    });
    expect(createdResponse.status).toBe(201);
    const created = (await createdResponse.json()) as { article: { id: string; status: string } };
    expect(created.article.status).toBe("draft");

    const published = await app().request(
      `/api/content/admin/articles/${created.article.id}/publish`,
      { method: "POST" },
    );
    expect(published.status).toBe(200);
    expect(((await published.json()) as { article: { status: string } }).article.status).toBe(
      "published",
    );

    const unpublished = await app().request(
      `/api/content/admin/articles/${created.article.id}/unpublish`,
      { method: "POST" },
    );
    expect(unpublished.status).toBe(200);
    expect(((await unpublished.json()) as { article: { status: string } }).article.status).toBe(
      "draft",
    );
  });
});
