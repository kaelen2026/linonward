import { Hono } from "hono";
import type { AppEnv } from "../../shared/module.js";
import type { ContentService } from "./service.js";

const localeOf = (value: string | undefined) => (value === "en" ? "en" : "zh");

export function createContentRoutes(service: ContentService): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();
  routes.get("/articles", async (c) =>
    c.json({ articles: await service.listPublished(localeOf(c.req.query("locale"))) }),
  );
  routes.get("/articles/:slug", async (c) =>
    c.json({
      article: await service.getPublished(localeOf(c.req.query("locale")), c.req.param("slug")),
    }),
  );
  routes.get("/admin/articles", async (c) =>
    c.json({ articles: await service.listAdmin(c.req.raw.headers) }),
  );
  routes.get("/admin/access", async (c) => c.json(await service.access(c.req.raw.headers)));
  routes.post("/admin/articles", async (c) =>
    c.json(
      {
        article: await service.create(
          c.req.raw.headers,
          c.var.requestId,
          await c.req.json().catch(() => undefined),
        ),
      },
      201,
    ),
  );
  routes.put("/admin/articles/:id", async (c) =>
    c.json({
      article: await service.update(
        c.req.raw.headers,
        c.var.requestId,
        c.req.param("id"),
        await c.req.json().catch(() => undefined),
      ),
    }),
  );
  for (const status of ["published", "draft"] as const) {
    const command = status === "published" ? "publish" : "unpublish";
    routes.post(`/admin/articles/:id/${command}`, async (c) =>
      c.json({
        article: await service.setPublication(
          c.req.raw.headers,
          c.var.requestId,
          c.req.param("id"),
          status,
        ),
      }),
    );
  }
  routes.delete("/admin/articles/:id", async (c) => {
    await service.delete(c.req.raw.headers, c.var.requestId, c.req.param("id"));
    return c.body(null, 204);
  });
  return routes;
}
