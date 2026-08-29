import { z } from "zod";

import {
  articleDraftInputSchema,
  articlesResponseSchema,
  contentAccessSchema,
  singleArticleResponseSchema,
} from "./content.js";
import { healthReportSchema } from "./health.js";

const json = (schema: { readonly $ref: string }) => ({
  content: { "application/json": { schema } },
});
const reference = (name: string) => ({ $ref: `#/components/schemas/${name}` }) as const;

/** Application-owned routes. Better Auth's wildcard handler retains its upstream contract. */
export const openApiDocument = {
  openapi: "3.1.0",
  info: { title: "LinOnward API", version: "0.0.0" },
  paths: {
    "/health": {
      get: {
        operationId: "getHealth",
        responses: {
          "200": { description: "Service liveness and version", ...json(reference("Health")) },
        },
      },
    },
    "/health/ready": {
      get: {
        operationId: "getReadiness",
        responses: {
          "200": { description: "All configured dependencies are reachable" },
          "503": { description: "A configured dependency is unavailable" },
        },
      },
    },
    "/contact/inquiries": {
      post: {
        operationId: "createInquiry",
        responses: {
          "201": { description: "Inquiry accepted" },
          "400": { description: "Invalid request" },
          "429": { description: "Rate limited" },
        },
      },
    },
    "/api/content/articles": {
      get: {
        operationId: "listPublishedArticles",
        responses: {
          "200": { description: "Published articles", ...json(reference("ArticlesResponse")) },
        },
      },
    },
    "/api/content/articles/{slug}": {
      get: {
        operationId: "getPublishedArticle",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Published article", ...json(reference("ArticleResponse")) },
          "404": { description: "Article not found" },
        },
      },
    },
    "/api/content/admin/articles": {
      get: {
        operationId: "listAdminArticles",
        responses: {
          "200": { description: "All articles", ...json(reference("ArticlesResponse")) },
          "401": { description: "Authentication required" },
          "403": { description: "Administrator access required" },
        },
      },
      post: {
        operationId: "createArticle",
        requestBody: { required: true, ...json(reference("ArticleInput")) },
        responses: {
          "201": { description: "Article created", ...json(reference("ArticleResponse")) },
          "400": { description: "Invalid article" },
        },
      },
    },
    "/api/content/admin/articles/{id}": {
      put: {
        operationId: "updateArticle",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, ...json(reference("ArticleInput")) },
        responses: {
          "200": { description: "Article updated", ...json(reference("ArticleResponse")) },
          "404": { description: "Article not found" },
        },
      },
      delete: {
        operationId: "deleteArticle",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "204": { description: "Article deleted" },
          "404": { description: "Article not found" },
        },
      },
    },
    "/api/content/admin/articles/{id}/publish": {
      post: {
        operationId: "publishArticle",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Article published", ...json(reference("ArticleResponse")) },
          "401": { description: "Authentication required" },
          "403": { description: "Publication capability required" },
          "404": { description: "Article not found" },
        },
      },
    },
    "/api/content/admin/articles/{id}/unpublish": {
      post: {
        operationId: "unpublishArticle",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Article unpublished", ...json(reference("ArticleResponse")) },
          "401": { description: "Authentication required" },
          "403": { description: "Publication capability required" },
          "404": { description: "Article not found" },
        },
      },
    },
    "/api/content/admin/access": {
      get: {
        operationId: "getContentAccess",
        responses: {
          "200": {
            description: "Current content roles and capabilities",
            ...json(reference("ContentAccess")),
          },
          "401": { description: "Authentication required" },
          "403": { description: "Content role required" },
        },
      },
    },
  },
  components: {
    schemas: {
      Health: z.toJSONSchema(healthReportSchema),
      ArticleInput: z.toJSONSchema(articleDraftInputSchema),
      ArticleResponse: z.toJSONSchema(singleArticleResponseSchema),
      ArticlesResponse: z.toJSONSchema(articlesResponseSchema),
      ContentAccess: z.toJSONSchema(contentAccessSchema),
    },
  },
} as const;
