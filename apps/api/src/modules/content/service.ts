import type { ArticleInput } from "@linonward/contracts/content";
import { eq } from "drizzle-orm";
import { ApiError } from "../../shared/api-error.js";
import { articles, type Database } from "../../shared/database.js";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type ContentDatabase = Database | Transaction;

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
