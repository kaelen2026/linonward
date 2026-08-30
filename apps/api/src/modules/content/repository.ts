import type { ArticleInput, ContentRole } from "@linonward/contracts/content";
import type { ContentAuditEvent } from "./audit.js";

export type ArticleRecord = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: unknown;
  coverImageUrl: string | null;
  locale: string;
  status: string;
  authorName: string;
  seoDescription: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ContentMutationRepository = {
  appendAudit(event: ContentAuditEvent): Promise<void>;
  createDraft(input: ArticleInput, id: string, now: Date): Promise<ArticleRecord>;
  deleteArticle(id: string): Promise<boolean>;
  lockArticleStatus(id: string): Promise<string | undefined>;
  setPublicationStatus(
    id: string,
    status: "draft" | "published",
    now: Date,
  ): Promise<ArticleRecord | undefined>;
  updateArticle(input: ArticleInput, id: string, now: Date): Promise<ArticleRecord>;
};

export type ContentRepository = {
  appendAudit(event: ContentAuditEvent): Promise<void>;
  assignedRoles(userId: string): Promise<readonly ContentRole[]>;
  findPublished(locale: "zh" | "en", slug: string): Promise<ArticleRecord | undefined>;
  listAll(): Promise<readonly ArticleRecord[]>;
  listPublished(locale: "zh" | "en"): Promise<readonly ArticleRecord[]>;
  transaction<T>(operation: (repository: ContentMutationRepository) => Promise<T>): Promise<T>;
};
