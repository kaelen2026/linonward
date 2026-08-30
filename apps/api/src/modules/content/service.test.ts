import { describe, expect, it, vi } from "vitest";
import type { ArticleRecord, ContentMutationRepository, ContentRepository } from "./repository.js";
import { createContentService } from "./service.js";

const now = new Date("2026-08-30T01:00:00.000Z");
const input = {
  title: "Test article",
  slug: "test-article",
  excerpt: "Test excerpt",
  content: { type: "doc" },
  coverImageUrl: null,
  locale: "en" as const,
  authorName: "Editor",
  seoDescription: "Test description",
};
const article: ArticleRecord = {
  ...input,
  id: "art_1",
  status: "draft",
  publishedAt: null,
  createdAt: now,
  updatedAt: now,
};

function repositories(overrides: Partial<ContentMutationRepository> = {}) {
  const failureEvents: unknown[] = [];
  const transactionEvents: unknown[] = [];
  const mutation: ContentMutationRepository = {
    appendAudit: async (event) => {
      transactionEvents.push(event);
    },
    createDraft: async () => article,
    deleteArticle: async () => true,
    lockArticleStatus: async () => "draft",
    setPublicationStatus: async () => article,
    updateArticle: async () => article,
    ...overrides,
  };
  const repository: ContentRepository = {
    appendAudit: async (event) => {
      failureEvents.push(event);
    },
    assignedRoles: async () => [],
    findPublished: async () => undefined,
    listAll: async () => [],
    listPublished: async () => [],
    transaction: (operation) => operation(mutation),
  };
  return { failureEvents, mutation, repository, transactionEvents };
}

function service(repository: ContentRepository) {
  return createContentService({
    repository,
    authenticate: async () => ({
      user: { id: "user_1", email: "admin@example.com", name: "Administrator" },
    }),
    administratorEmails: ["admin@example.com"],
    clock: () => now,
    nextId: () => "art_1",
    nextAuditId: () => "audit_1",
  });
}

describe("content application service", () => {
  it("commits a successful mutation and its audit event through one transaction", async () => {
    const { repository, transactionEvents, failureEvents } = repositories();

    await expect(service(repository).create(new Headers(), "req_1", input)).resolves.toEqual(
      article,
    );
    expect(transactionEvents).toMatchObject([
      { action: "article.create", targetId: "art_1", outcome: "success" },
    ]);
    expect(failureEvents).toEqual([]);
  });

  it("records invalid input after the transaction rejects", async () => {
    const { repository, transactionEvents, failureEvents } = repositories();

    await expect(service(repository).create(new Headers(), "req_1", {})).rejects.toMatchObject({
      code: "invalid_article",
    });
    expect(transactionEvents).toEqual([]);
    expect(failureEvents).toMatchObject([
      { action: "article.create", outcome: "failure", errorCode: "invalid_article" },
    ]);
  });

  it("authorizes an update against the status locked inside the transaction", async () => {
    const { repository, failureEvents } = repositories({
      lockArticleStatus: async () => "published",
    });
    repository.assignedRoles = async () => ["editor"];
    const editorService = createContentService({
      repository,
      authenticate: async () => ({
        user: { id: "editor_1", email: "editor@example.com", name: "Editor" },
      }),
      administratorEmails: [],
      clock: () => now,
      nextId: () => "art_1",
      nextAuditId: () => "audit_1",
    });

    await expect(
      editorService.update(new Headers(), "req_1", "art_1", input),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(failureEvents).toMatchObject([
      { action: "article.update", outcome: "failure", errorCode: "forbidden" },
    ]);
  });

  it("queries published content through the repository port", async () => {
    const { repository } = repositories();
    repository.listPublished = vi.fn(async () => [article]);

    await expect(service(repository).listPublished("en")).resolves.toEqual([article]);
    expect(repository.listPublished).toHaveBeenCalledWith("en");
  });
});
