import { type ContentRole, contentRoles } from "@linonward/contracts/content";
import { and, desc, eq } from "drizzle-orm";
import {
  articles,
  contentAuditEvents,
  contentRoleAssignments,
  type Database,
} from "../../shared/database.js";
import type { ContentAuditEvent } from "./audit.js";
import type { ContentMutationRepository, ContentRepository } from "./repository.js";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type ContentDatabase = Database | Transaction;

const appendAudit = async (database: ContentDatabase, event: ContentAuditEvent) => {
  await database
    .insert(contentAuditEvents)
    .values({ ...event, errorCode: event.errorCode ?? null });
};

function mutations(database: ContentDatabase): ContentMutationRepository {
  return {
    appendAudit: (event) => appendAudit(database, event),
    async createDraft(input, id, now) {
      const [created] = await database
        .insert(articles)
        .values({
          ...input,
          id,
          status: "draft",
          publishedAt: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return created!;
    },
    async deleteArticle(id) {
      const deleted = await database
        .delete(articles)
        .where(eq(articles.id, id))
        .returning({ id: articles.id });
      return deleted.length > 0;
    },
    async lockArticleStatus(id) {
      const [existing] = await database
        .select({ status: articles.status })
        .from(articles)
        .where(eq(articles.id, id))
        .limit(1)
        .for("update");
      return existing?.status;
    },
    async setPublicationStatus(id, status, now) {
      const [updated] = await database
        .update(articles)
        .set({ status, publishedAt: status === "published" ? now : null, updatedAt: now })
        .where(eq(articles.id, id))
        .returning();
      return updated;
    },
    async updateArticle(input, id, now) {
      const [updated] = await database
        .update(articles)
        .set({ ...input, updatedAt: now })
        .where(eq(articles.id, id))
        .returning();
      return updated!;
    },
  };
}

export function createPostgresContentRepository(database: Database): ContentRepository {
  return {
    appendAudit: (event) => appendAudit(database, event),
    async assignedRoles(userId) {
      const assignments = await database
        .select({ role: contentRoleAssignments.role })
        .from(contentRoleAssignments)
        .where(eq(contentRoleAssignments.userId, userId));
      return assignments
        .map(({ role }) => role)
        .filter((role): role is ContentRole => contentRoles.includes(role as ContentRole));
    },
    async findPublished(locale, slug) {
      const [article] = await database
        .select()
        .from(articles)
        .where(
          and(
            eq(articles.locale, locale),
            eq(articles.slug, slug),
            eq(articles.status, "published"),
          ),
        )
        .limit(1);
      return article;
    },
    listAll: () => database.select().from(articles).orderBy(desc(articles.updatedAt)),
    listPublished: (locale) =>
      database
        .select()
        .from(articles)
        .where(and(eq(articles.locale, locale), eq(articles.status, "published")))
        .orderBy(desc(articles.publishedAt)),
    transaction: (operation) =>
      database.transaction((transaction) => operation(mutations(transaction))),
  };
}
