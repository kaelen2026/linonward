import {
  articlesResponseSchema,
  type Article as ContractArticle,
  singleArticleResponseSchema,
} from "@linonward/contracts/content";
import type { RichTextDocument } from "@/components/editor/rich-text-schema";
import { apiUrl, requestJson } from "./api";

export type Article = Omit<ContractArticle, "content"> & { content: RichTextDocument };
export type { ArticleInput } from "@linonward/contracts/content";

const previewArticle: Article = {
  id: "preview",
  title: "在不确定的世界里，构建可持续的产品",
  slug: "building-sustainable-products",
  excerpt: "不确定性正在成为创新的常态。真正值得构建的产品，更关注长期的韧性与进化。",
  content: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "不确定性正在成为创新的常态。技术迭代加速、用户需求多变，产品要如何持续创造价值？",
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "以系统思维看待产品" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "产品不是孤立的功能集合，而是由用户、场景、数据与组织共同构成的系统。",
          },
        ],
      },
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "当我们从系统层面理解问题，才能找到真正有杠杆效应的解法。" },
            ],
          },
        ],
      },
    ],
  },
  coverImageUrl: null,
  locale: "zh",
  status: "published",
  authorName: "LinOnward 编辑部",
  seoDescription: "以系统思维构建可持续产品。",
  publishedAt: "2026-08-20T08:00:00.000Z",
  createdAt: "2026-08-20T07:00:00.000Z",
  updatedAt: "2026-08-20T08:00:00.000Z",
};

function previewArticles(locale: "zh" | "en") {
  return process.env.NODE_ENV === "development" && locale === "zh" ? [previewArticle] : [];
}

export function parseArticlesResponse(payload: unknown): Article[] {
  return articlesResponseSchema.parse(payload).articles as Article[];
}

export function parseArticleResponse(payload: unknown): Article {
  return singleArticleResponseSchema.parse(payload).article as Article;
}

export async function fetchArticles(locale: "zh" | "en" = "zh"): Promise<Article[]> {
  let payload: unknown;
  try {
    payload = await requestJson<unknown>(apiUrl(`/api/content/articles?locale=${locale}`), {
      next: { revalidate: 60 },
    });
  } catch {
    return previewArticles(locale);
  }
  const articles = parseArticlesResponse(payload);
  return articles.length > 0 ? articles : previewArticles(locale);
}

export async function fetchArticle(
  id: string,
  locale: "zh" | "en" = "zh",
): Promise<Article | null> {
  const articles = await fetchArticles(locale);
  return articles.find((article) => article.id === id) ?? null;
}

export function readingMinutes(document: RichTextDocument): number {
  const visit = (node: unknown): number => {
    if (!node || typeof node !== "object") return 0;
    const item = node as { text?: unknown; content?: unknown };
    const own = typeof item.text === "string" ? item.text.replace(/\s/g, "").length : 0;
    return (
      own +
      (Array.isArray(item.content) ? item.content.reduce((sum, child) => sum + visit(child), 0) : 0)
    );
  };
  return Math.max(1, Math.ceil(visit(document) / 400));
}
