import {
  articleDraftInputSchema,
  type ContentRole,
  contentRoles,
} from "@linonward/contracts/content";
import { and, desc, eq } from "drizzle-orm";
import { type Context, Hono } from "hono";
import { ApiError } from "../../shared/api-error.js";
import {
  articles,
  contentAuditEvents,
  contentRoleAssignments,
  type Database,
} from "../../shared/database.js";
import type { AppEnv } from "../../shared/module.js";
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
import { createDraft, setPublicationStatus, updateArticle } from "./service.js";

export type ContentRouteDependencies = {
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
  await database
    .insert(contentAuditEvents)
    .values({ ...event, errorCode: event.errorCode ?? null });
}

export function createContentRoutes(options: ContentRouteDependencies): Hono<AppEnv> {
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
  ) =>
    executeAuditedContentMutation({
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
      const parsed = articleDraftInputSchema.safeParse(await c.req.json().catch(() => undefined));
      if (!parsed.success) throw new ApiError(400, "invalid_article", "Article fields are invalid");
      authorizeContent(actor, "article.createDraft");
      return createDraft(database, parsed.data, id, options.clock());
    });
    return c.json({ article }, 201);
  });
  routes.put("/admin/articles/:id", async (c) => {
    const actor = await principal(c.req.raw.headers);
    const id = c.req.param("id");
    if (!id) throw new ApiError(400, "article_id_required", "Article id is required");
    const article = await auditedMutation(c, actor, "article.update", id, async (database) => {
      const parsed = articleDraftInputSchema.safeParse(await c.req.json().catch(() => undefined));
      if (!parsed.success) throw new ApiError(400, "invalid_article", "Article fields are invalid");
      return updateArticle(database, parsed.data, id, options.clock(), (status) =>
        authorizeContent(actor, status === "published" ? "article.publish" : "article.updateDraft"),
      );
    });
    return c.json({ article });
  });
  const publicationCommand = (status: "draft" | "published") => async (c: Context<AppEnv>) => {
    const actor = await principal(c.req.raw.headers);
    const id = c.req.param("id");
    if (!id) throw new ApiError(400, "article_id_required", "Article id is required");
    const action = status === "published" ? "article.publish" : "article.unpublish";
    const article = await auditedMutation(c, actor, action, id, async (database) => {
      authorizeContent(actor, "article.publish");
      return setPublicationStatus(database, id, status, options.clock());
    });
    return c.json({ article });
  };
  routes.post("/admin/articles/:id/publish", publicationCommand("published"));
  routes.post("/admin/articles/:id/unpublish", publicationCommand("draft"));
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
  return routes;
}
