import { articleInputSchema } from "@linonward/contracts/content";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { ApiError } from "../../shared/api-error.js";
import { articles, type Database } from "../../shared/database.js";
import type { ApiModule, AppEnv } from "../../shared/module.js";
import { type ContentSession, requireContentAdministrator } from "./authorization.js";

type Options = {
  database: Database;
  authenticate: ((headers: Headers) => Promise<ContentSession>) | undefined;
  administratorEmails: readonly string[];
  clock: () => Date;
  nextId: () => string;
};

export function createContentModule(options: Options): ApiModule {
  const routes = new Hono<AppEnv>();
  const administrator = async (headers: Headers) => {
    if (!options.authenticate)
      throw new ApiError(503, "auth_unavailable", "Authentication is unavailable");
    return requireContentAdministrator(
      await options.authenticate(headers),
      options.administratorEmails,
    );
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
    await administrator(c.req.raw.headers);
    return c.json({
      articles: await options.database.select().from(articles).orderBy(desc(articles.updatedAt)),
    });
  });
  routes.post("/admin/articles", async (c) => {
    await administrator(c.req.raw.headers);
    const parsed = articleInputSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!parsed.success) throw new ApiError(400, "invalid_article", "Article fields are invalid");
    const now = options.clock();
    const [article] = await options.database
      .insert(articles)
      .values({
        ...parsed.data,
        id: options.nextId(),
        publishedAt: parsed.data.status === "published" ? now : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return c.json({ article }, 201);
  });
  routes.put("/admin/articles/:id", async (c) => {
    await administrator(c.req.raw.headers);
    const parsed = articleInputSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!parsed.success) throw new ApiError(400, "invalid_article", "Article fields are invalid");
    const [existing] = await options.database
      .select({ publishedAt: articles.publishedAt })
      .from(articles)
      .where(eq(articles.id, c.req.param("id")))
      .limit(1);
    if (!existing) throw new ApiError(404, "article_not_found", "Article not found");
    const [article] = await options.database
      .update(articles)
      .set({
        ...parsed.data,
        publishedAt:
          parsed.data.status === "published" ? (existing.publishedAt ?? options.clock()) : null,
        updatedAt: options.clock(),
      })
      .where(eq(articles.id, c.req.param("id")))
      .returning();
    return c.json({ article });
  });
  routes.delete("/admin/articles/:id", async (c) => {
    await administrator(c.req.raw.headers);
    const deleted = await options.database
      .delete(articles)
      .where(eq(articles.id, c.req.param("id")))
      .returning({ id: articles.id });
    if (deleted.length === 0) throw new ApiError(404, "article_not_found", "Article not found");
    return c.body(null, 204);
  });
  return { name: "content", basePath: "/api/content", routes };
}
