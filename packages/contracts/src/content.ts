import { z } from "zod";

export const articleLimits = {
  title: { max: 180 },
  slug: { max: 160 },
  excerpt: { max: 400 },
  authorName: { max: 80 },
  seoDescription: { max: 320 },
} as const;

export const articleLocales = ["zh", "en"] as const;
export const articleStatuses = ["draft", "published"] as const;
export const contentRoles = ["administrator", "editor"] as const;
export const contentCapabilities = [
  "article.view",
  "article.createDraft",
  "article.updateDraft",
  "article.publish",
  "article.delete",
] as const;

const articleContentSchema = z.record(z.string(), z.unknown());

export const articleDraftInputSchema = z.object({
  title: z.string().trim().min(1).max(articleLimits.title.max),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(articleLimits.slug.max),
  excerpt: z.string().trim().min(1).max(articleLimits.excerpt.max),
  content: articleContentSchema,
  coverImageUrl: z.url().nullable(),
  locale: z.enum(articleLocales),
  authorName: z.string().trim().min(1).max(articleLimits.authorName.max),
  seoDescription: z.string().trim().min(1).max(articleLimits.seoDescription.max),
});

export const articleSchema = articleDraftInputSchema.extend({
  id: z.string().min(1),
  status: z.enum(articleStatuses),
  publishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const articleResponseSchema = articleSchema;
export const articlesResponseSchema = z.object({ articles: z.array(articleSchema) });
export const singleArticleResponseSchema = z.object({ article: articleSchema });
export const contentAccessSchema = z.object({
  roles: z.array(z.enum(contentRoles)),
  capabilities: z.array(z.enum(contentCapabilities)),
});

export const articleInputSchema = articleDraftInputSchema;

export type ArticleInput = z.infer<typeof articleDraftInputSchema>;
export type Article = z.infer<typeof articleSchema>;
export type ContentRole = (typeof contentRoles)[number];
export type ContentCapability = (typeof contentCapabilities)[number];
export type ContentAccess = z.infer<typeof contentAccessSchema>;
