import { type ArticleInput, articleDraftInputSchema } from "@linonward/contracts/content";
import { ApiError } from "../../shared/api-error.js";
import { type ContentAuditAction, executeAuditedContentMutation } from "./audit.js";
import {
  authorizeContent,
  type ContentPrincipal,
  type ContentSession,
  capabilitiesFor,
  contentPrincipal,
} from "./authorization.js";
import type { ContentMutationRepository, ContentRepository } from "./repository.js";

export type ContentServiceDependencies = {
  repository: ContentRepository;
  authenticate: ((headers: Headers) => Promise<ContentSession>) | undefined;
  administratorEmails: readonly string[];
  clock: () => Date;
  nextId: () => string;
  nextAuditId: () => string;
};

function parseInput(input: unknown): ArticleInput {
  const parsed = articleDraftInputSchema.safeParse(input);
  if (!parsed.success) throw new ApiError(400, "invalid_article", "Article fields are invalid");
  return parsed.data;
}

function requireId(id: string): string {
  if (!id) throw new ApiError(400, "article_id_required", "Article id is required");
  return id;
}

export function createContentService(options: ContentServiceDependencies) {
  const principal = async (headers: Headers): Promise<ContentPrincipal> => {
    if (!options.authenticate)
      throw new ApiError(503, "auth_unavailable", "Authentication is unavailable");
    const session = await options.authenticate(headers);
    if (!session) return contentPrincipal(session, [], options.administratorEmails);
    const email = session.user.email.trim().toLowerCase();
    if (options.administratorEmails.includes(email)) {
      return contentPrincipal(session, [], options.administratorEmails);
    }
    const roles = await options.repository.assignedRoles(session.user.id);
    return contentPrincipal(session, roles, options.administratorEmails);
  };
  const auditedMutation = async <T>(
    actor: ContentPrincipal,
    requestId: string,
    action: ContentAuditAction,
    targetId: string,
    operation: (repository: ContentMutationRepository) => Promise<T>,
  ) =>
    executeAuditedContentMutation({
      action,
      actorEmail: actor.user.email,
      targetId,
      requestId,
      occurredAt: options.clock(),
      nextId: options.nextAuditId,
      commit: (event) =>
        options.repository.transaction(async (repository) => {
          const result = await operation(repository);
          await repository.appendAudit(event);
          return result;
        }),
      recordFailure: (event) => options.repository.appendAudit(event),
    });

  return {
    async listPublished(locale: "zh" | "en") {
      return options.repository.listPublished(locale);
    },
    async getPublished(locale: "zh" | "en", slug: string) {
      const article = await options.repository.findPublished(locale, slug);
      if (!article) throw new ApiError(404, "article_not_found", "Article not found");
      return article;
    },
    async listAdmin(headers: Headers) {
      authorizeContent(await principal(headers), "article.view");
      return options.repository.listAll();
    },
    async access(headers: Headers) {
      const actor = authorizeContent(await principal(headers), "article.view");
      return { roles: actor.roles, capabilities: capabilitiesFor(actor) };
    },
    async create(headers: Headers, requestId: string, input: unknown) {
      const actor = await principal(headers);
      const id = options.nextId();
      return auditedMutation(actor, requestId, "article.create", id, async (repository) => {
        const articleInput = parseInput(input);
        authorizeContent(actor, "article.createDraft");
        return repository.createDraft(articleInput, id, options.clock());
      });
    },
    async update(headers: Headers, requestId: string, candidateId: string, input: unknown) {
      const actor = await principal(headers);
      const id = requireId(candidateId);
      return auditedMutation(actor, requestId, "article.update", id, async (repository) => {
        const articleInput = parseInput(input);
        const status = await repository.lockArticleStatus(id);
        if (!status) throw new ApiError(404, "article_not_found", "Article not found");
        if (status !== "draft" && status !== "published") {
          throw new ApiError(500, "invalid_article_status", "Article status is invalid");
        }
        authorizeContent(actor, status === "published" ? "article.publish" : "article.updateDraft");
        return repository.updateArticle(articleInput, id, options.clock());
      });
    },
    async setPublication(
      headers: Headers,
      requestId: string,
      candidateId: string,
      status: "draft" | "published",
    ) {
      const actor = await principal(headers);
      const id = requireId(candidateId);
      const action = status === "published" ? "article.publish" : "article.unpublish";
      return auditedMutation(actor, requestId, action, id, async (repository) => {
        authorizeContent(actor, "article.publish");
        const article = await repository.setPublicationStatus(id, status, options.clock());
        if (!article) throw new ApiError(404, "article_not_found", "Article not found");
        return article;
      });
    },
    async delete(headers: Headers, requestId: string, candidateId: string) {
      const actor = await principal(headers);
      const id = requireId(candidateId);
      await auditedMutation(actor, requestId, "article.delete", id, async (repository) => {
        authorizeContent(actor, "article.delete");
        if (!(await repository.deleteArticle(id))) {
          throw new ApiError(404, "article_not_found", "Article not found");
        }
      });
    },
  };
}

export type ContentService = ReturnType<typeof createContentService>;
