import { articleInputSchema, type ContentRole, contentRoles } from "@linonward/contracts/content";
import { and, desc, eq } from "drizzle-orm";
import { type Context, Hono } from "hono";
import { ApiError } from "../../shared/api-error.js";
import {
  articles,
  contentAuditEvents,
  contentRoleAssignments,
  type Database,
} from "../../shared/database.js";
import type { ApiModule, AppEnv } from "../../shared/module.js";
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

type Options = {
  database: Database;
  authenticate: ((headers: Headers) => Promise<ContentSession>) | undefined;
  administratorEmails: readonly string[];
  clock: () => Date;
  nextId: () => string;
  nextAuditId: () => string;
};

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type ContentDatabase = Database | Transaction;

async function appendAudit(database: ContentDatabase, event: ContentAuditEvent): Promise<void> {
  await database.insert(contentAuditEvents).values({
    ...event,
    errorCode: event.errorCode ?? null,
  });
}

export function createContentModule(options: Options): ApiModule {
  const routes = new Hono<AppEnv>();
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
    c: Context<AppEnv>,
    actor: ContentPrincipal,
    action: ContentAuditAction,
    targetId: string,
    operation: (database: ContentDatabase) => Promise<T>,
  ) => {
    return executeAuditedContentMutation({
      action,
      actorEmail: actor.user.email,
      targetId,
      requestId: c.var.requestId,
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
  };

  routes.get("/articles", async (c) => {
    const locale = c.req.query("locale") === "en" ? "en" : "zh";
    const result = await options.database
      .select()
      .from(articles)
      .where(and(eq(articles.locale, locale), eq(articles.status, "published")))
      .orderBy(desc(articles.publishedAt));
    return c.json({ articles: result });
  });
  routes.get("/articles/:slug", async (c) => {
    const locale = c.req.query("locale") === "en" ? "en" : "zh";
    const [article] = await options.database
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.locale, locale),
          eq(articles.slug, c.req.param("slug")),
          eq(articles.status, "published"),
        ),
      )
      .limit(1);
    if (!article) throw new ApiError(404, "article_not_found", "Article not found");
    return c.json({ article });
  });
  routes.get("/admin/articles", async (c) => {
    authorizeContent(await principal(c.req.raw.headers), "article.view");
    return c.json({
      articles: await options.database.select().from(articles).orderBy(desc(articles.updatedAt)),
    });
  });
  routes.get("/admin/access", async (c) => {
    const actor = authorizeContent(await principal(c.req.raw.headers), "article.view");
    return c.json({ roles: actor.roles, capabilities: capabilitiesFor(actor) });
  });
  routes.post("/admin/articles", async (c) => {
    const actor = await principal(c.req.raw.headers);
    const id = options.nextId();
    const article = await auditedMutation(c, actor, "article.create", id, async (database) => {
      const parsed = articleInputSchema.safeParse(await c.req.json().catch(() => undefined));
      if (!parsed.success) throw new ApiError(400, "invalid_article", "Article fields are invalid");
      authorizeContent(
        actor,
        parsed.data.status === "published" ? "article.publish" : "article.createDraft",
      );
      const now = options.clock();
      const [created] = await database
        .insert(articles)
        .values({
          ...parsed.data,
          id,
          publishedAt: parsed.data.status === "published" ? now : null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return created;
    });
    return c.json({ article }, 201);
  });
  routes.put("/admin/articles/:id", async (c) => {
    const actor = await principal(c.req.raw.headers);
    const id = c.req.param("id");
    const article = await auditedMutation(c, actor, "article.update", id, async (database) => {
      const parsed = articleInputSchema.safeParse(await c.req.json().catch(() => undefined));
      if (!parsed.success) throw new ApiError(400, "invalid_article", "Article fields are invalid");
      const [existing] = await database
        .select({ publishedAt: articles.publishedAt, status: articles.status })
        .from(articles)
        .where(eq(articles.id, id))
        .limit(1)
        .for("update");
      if (!existing) throw new ApiError(404, "article_not_found", "Article not found");
      authorizeContent(
        actor,
        existing.status === "published" || parsed.data.status === "published"
          ? "article.publish"
          : "article.updateDraft",
      );
      const [updated] = await database
        .update(articles)
        .set({
          ...parsed.data,
          publishedAt:
            parsed.data.status === "published" ? (existing.publishedAt ?? options.clock()) : null,
          updatedAt: options.clock(),
        })
        .where(eq(articles.id, id))
        .returning();
      return updated;
    });
    return c.json({ article });
  });
  routes.delete("/admin/articles/:id", async (c) => {
    const actor = await principal(c.req.raw.headers);
    const id = c.req.param("id");
    await auditedMutation(c, actor, "article.delete", id, async (database) => {
      authorizeContent(actor, "article.delete");
      const deleted = await database
        .delete(articles)
        .where(eq(articles.id, id))
        .returning({ id: articles.id });
      if (deleted.length === 0) throw new ApiError(404, "article_not_found", "Article not found");
    });
    return c.body(null, 204);
  });
  return { name: "content", basePath: "/api/content", routes };
}
