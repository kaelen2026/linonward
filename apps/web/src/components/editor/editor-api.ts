import type { ArticleInput } from "@linonward/contracts/content";
import { requestJson } from "@/lib/api";
import { type Article, parseArticleResponse, parseArticlesResponse } from "@/lib/articles";

const adminArticlesPath = "/api/content/admin/articles";

export async function listAdminArticles(): Promise<Article[]> {
  return parseArticlesResponse(await requestJson<unknown>(adminArticlesPath));
}

export async function saveAdminArticle({
  articleId,
  draft,
}: {
  articleId?: string;
  draft: ArticleInput;
}): Promise<Article> {
  const path = articleId ? `${adminArticlesPath}/${articleId}` : adminArticlesPath;
  return parseArticleResponse(
    await requestJson<unknown>(path, {
      body: JSON.stringify(draft),
      method: articleId ? "PUT" : "POST",
    }),
  );
}

export async function changeAdminArticlePublication({
  articleId,
  status,
}: {
  articleId: string;
  status: "draft" | "published";
}): Promise<Article> {
  const action = status === "published" ? "publish" : "unpublish";
  return parseArticleResponse(
    await requestJson<unknown>(`${adminArticlesPath}/${articleId}/${action}`, { method: "POST" }),
  );
}
