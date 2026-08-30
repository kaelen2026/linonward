import {
  type ArticleInput,
  articleDraftInputSchema,
  type ContentRole,
  contentRoles,
} from "@linonward/contracts/content";
import { and, desc, eq } from "drizzle-orm";
import { ApiError } from "../../shared/api-error.js";
import {
  articles,
  contentAuditEvents,
  contentRoleAssignments,
  type Database,
} from "../../shared/database.js";
import {
  type ContentAuditAction,
  type ContentAuditEvent,
  executeAuditedContentMutation,
} from "./audit.js";
import {
  authorizeContent,
  type ContentPrincipal,
  type ContentSession,
  capabilitiesFor,
  contentPrincipal,
} from "./authorization.js";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type ContentDatabase = Database | Transaction;

export type ContentServiceDependencies = {
  database: Database;
  authenticate: ((headers: Headers) => Promise<ContentSession>) | undefined;
  administratorEmails: readonly string[];
  clock: () => Date;
  nextId: () => string;
  nextAuditId: () => string;
};

async function appendAudit(database: ContentDatabase, event: ContentAuditEvent): Promise<void> {
  await database
    .insert(contentAuditEvents)
    .values({ ...event, errorCode: event.errorCode ?? null });
}

function parseInput(input: unknown): ArticleInput {
  const parsed = articleDraftInputSchema.safeParse(input);
  if (!parsed.success) throw new ApiError(400, "invalid_article", "Article fields are invalid");
  return parsed.data;
}

function requireId(id: string): string {
  if (!id) throw new ApiError(400, "article_id_required", "Article id is required");
  return id;
}

export function createContentService(options: ContentServiceDependencies) {
  const principal = async (headers: Headers): Promise<ContentPrincipal> => {
    if (!options.authenticate)
      throw new ApiError(503, "auth_unavailable", "Authentication is unavailable");
    const session = await options.authenticate(headers);
    if (!session) return contentPrincipal(session, [], options.administratorEmails);
    const email = session.user.email.trim().toLowerCase();
    if (options.administratorEmails.includes(email)) {
      return contentPrincipal(session, [], options.administratorEmails);
    }
    const assignments = await options.database
      .select({ role: contentRoleAssignments.role })
      .from(contentRoleAssignments)
      .where(eq(contentRoleAssignments.userId, session.user.id));
    const roles = assignments
      .map(({ role }) => role)
      .filter((role): role is ContentRole => contentRoles.includes(role as ContentRole));
    return contentPrincipal(session, roles, options.administratorEmails);
  };
  const auditedMutation = async <T>(
    actor: ContentPrincipal,
    requestId: string,
    action: ContentAuditAction,
    targetId: string,
    operation: (database: ContentDatabase) => Promise<T>,
  ) =>
    executeAuditedContentMutation({
      action,
      actorEmail: actor.user.email,
      targetId,
      requestId,
      occurredAt: options.clock(),
      nextId: options.nextAuditId,
      commit: (event) =>
        options.database.transaction(async (transaction) => {
          const result = await operation(transaction);
          await appendAudit(transaction, event);
          return result;
        }),
      recordFailure: (event) => appendAudit(options.database, event),
    });

  return {
    async listPublished(locale: "zh" | "en") {
      return options.database
        .select()
        .from(articles)
        .where(and(eq(articles.locale, locale), eq(articles.status, "published")))
        .orderBy(desc(articles.publishedAt));
    },
    async getPublished(locale: "zh" | "en", slug: string) {
      const [article] = await options.database
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
      if (!article) throw new ApiError(404, "article_not_found", "Article not found");
      return article;
    },
    async listAdmin(headers: Headers) {
      authorizeContent(await principal(headers), "article.view");
      return options.database.select().from(articles).orderBy(desc(articles.updatedAt));
    },
    async access(headers: Headers) {
      const actor = authorizeContent(await principal(headers), "article.view");
      return { roles: actor.roles, capabilities: capabilitiesFor(actor) };
    },
    async create(headers: Headers, requestId: string, input: unknown) {
      const actor = await principal(headers);
      const id = options.nextId();
      return auditedMutation(actor, requestId, "article.create", id, async (database) => {
        const articleInput = parseInput(input);
        authorizeContent(actor, "article.createDraft");
        return createDraft(database, articleInput, id, options.clock());
      });
    },
    async update(headers: Headers, requestId: string, candidateId: string, input: unknown) {
      const actor = await principal(headers);
      const id = requireId(candidateId);
      return auditedMutation(actor, requestId, "article.update", id, async (database) => {
        const articleInput = parseInput(input);
        return updateArticle(database, articleInput, id, options.clock(), (status) =>
          authorizeContent(
            actor,
            status === "published" ? "article.publish" : "article.updateDraft",
          ),
        );
      });
    },
    async setPublication(
      headers: Headers,
      requestId: string,
      candidateId: string,
      status: "draft" | "published",
    ) {
      const actor = await principal(headers);
      const id = requireId(candidateId);
      const action = status === "published" ? "article.publish" : "article.unpublish";
      return auditedMutation(actor, requestId, action, id, async (database) => {
        authorizeContent(actor, "article.publish");
        return setPublicationStatus(database, id, status, options.clock());
      });
    },
    async delete(headers: Headers, requestId: string, candidateId: string) {
      const actor = await principal(headers);
      const id = requireId(candidateId);
      await auditedMutation(actor, requestId, "article.delete", id, async (database) => {
        authorizeContent(actor, "article.delete");
        const deleted = await database
          .delete(articles)
          .where(eq(articles.id, id))
          .returning({ id: articles.id });
        if (deleted.length === 0) throw new ApiError(404, "article_not_found", "Article not found");
      });
    },
  };
}

export type ContentService = ReturnType<typeof createContentService>;

export async function createDraft(
  database: ContentDatabase,
  input: ArticleInput,
  id: string,
  now: Date,
) {
  const [created] = await database
    .insert(articles)
    .values({ ...input, id, status: "draft", publishedAt: null, createdAt: now, updatedAt: now })
    .returning();
  return created;
}

export async function updateArticle(
  database: ContentDatabase,
  input: ArticleInput,
  id: string,
  now: Date,
  authorizeStatus: (status: "draft" | "published") => void,
) {
  const [existing] = await database
    .select({ status: articles.status })
    .from(articles)
    .where(eq(articles.id, id))
    .limit(1)
    .for("update");
  if (!existing) throw new ApiError(404, "article_not_found", "Article not found");
  if (existing.status !== "draft" && existing.status !== "published") {
    throw new ApiError(500, "invalid_article_status", "Article status is invalid");
  }
  authorizeStatus(existing.status);
  const [updated] = await database
    .update(articles)
    .set({ ...input, updatedAt: now })
    .where(eq(articles.id, id))
    .returning();
  return updated;
}

export async function setPublicationStatus(
  database: ContentDatabase,
  id: string,
  status: "draft" | "published",
  now: Date,
) {
  const [updated] = await database
    .update(articles)
    .set({ status, publishedAt: status === "published" ? now : null, updatedAt: now })
    .where(eq(articles.id, id))
    .returning();
  if (!updated) throw new ApiError(404, "article_not_found", "Article not found");
  return updated;
}
