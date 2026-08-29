import { randomUUID } from "node:crypto";

import { articles, connectDatabase, contentAuditEvents } from "@linonward/db";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { type ContentAuditEvent, executeAuditedContentMutation } from "./audit.js";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("content audit integration", () => {
  const postgres = connectDatabase(databaseUrl ?? "");
  let articleId: string;
  let requestId: string;

  afterAll(async () => {
    await postgres.close();
  });

  beforeEach(async () => {
    articleId = `art_${randomUUID()}`;
    requestId = `req_${randomUUID()}`;
  });

  afterEach(async () => {
    await postgres.db.delete(contentAuditEvents).where(eq(contentAuditEvents.requestId, requestId));
    await postgres.db.delete(articles).where(eq(articles.id, articleId));
  });

  const insertAudit = async (
    database: Parameters<Parameters<typeof postgres.db.transaction>[0]>[0] | typeof postgres.db,
    event: ContentAuditEvent,
  ) => {
    await database
      .insert(contentAuditEvents)
      .values({ ...event, errorCode: event.errorCode ?? null });
  };

  it("commits an article and its success event together", async () => {
    await executeAuditedContentMutation({
      action: "article.create",
      actorEmail: "admin@linonward.com",
      targetId: articleId,
      requestId,
      occurredAt: new Date("2026-08-29T12:00:00.000Z"),
      nextId: () => `audit_${randomUUID()}`,
      commit: (event) =>
        postgres.db.transaction(async (transaction) => {
          await transaction.insert(articles).values({
            id: articleId,
            title: "Audited",
            slug: articleId,
            excerpt: "Audited article",
            content: { type: "doc" },
            locale: "en",
            status: "draft",
            authorName: "LinOnward",
            seoDescription: "Audited article",
          });
          await insertAudit(transaction, event);
        }),
      recordFailure: (event) => insertAudit(postgres.db, event),
    });

    expect(
      await postgres.db.select().from(articles).where(eq(articles.id, articleId)),
    ).toHaveLength(1);
    expect(
      await postgres.db
        .select()
        .from(contentAuditEvents)
        .where(eq(contentAuditEvents.requestId, requestId)),
    ).toMatchObject([{ targetId: articleId, outcome: "success", errorCode: null }]);
  });

  it("rolls back the article and retains a failure event", async () => {
    await expect(
      executeAuditedContentMutation({
        action: "article.create",
        actorEmail: "admin@linonward.com",
        targetId: articleId,
        requestId,
        occurredAt: new Date("2026-08-29T12:00:00.000Z"),
        nextId: () => `audit_${randomUUID()}`,
        commit: (event) =>
          postgres.db.transaction(async (transaction) => {
            await transaction.insert(articles).values({
              id: articleId,
              title: "Rolled back",
              slug: articleId,
              excerpt: "This write is rolled back",
              content: { type: "doc" },
              locale: "en",
              status: "draft",
              authorName: "LinOnward",
              seoDescription: "This write is rolled back",
            });
            await insertAudit(transaction, event);
            throw new Error("simulated failure");
          }),
        recordFailure: (event) => insertAudit(postgres.db, event),
      }),
    ).rejects.toThrow("simulated failure");

    expect(await postgres.db.select().from(articles).where(eq(articles.id, articleId))).toEqual([]);
    expect(
      await postgres.db
        .select()
        .from(contentAuditEvents)
        .where(eq(contentAuditEvents.requestId, requestId)),
    ).toMatchObject([{ targetId: articleId, outcome: "failure", errorCode: "Error" }]);
  });
});
