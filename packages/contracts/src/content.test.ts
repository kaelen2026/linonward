import { describe, expect, it } from "vitest";

import { articleInputSchema, articleResponseSchema, articlesResponseSchema } from "./content.js";

const article = {
  id: "art_1",
  title: "A durable contract",
  slug: "a-durable-contract",
  excerpt: "The contract shared by every client.",
  content: { type: "doc", content: [{ type: "paragraph" }] },
  coverImageUrl: null,
  locale: "en",
  status: "published",
  authorName: "LinOnward",
  seoDescription: "A durable content contract.",
  publishedAt: "2026-08-29T08:00:00.000Z",
  createdAt: "2026-08-29T07:00:00.000Z",
  updatedAt: "2026-08-29T08:00:00.000Z",
};

describe("content contract", () => {
  it("accepts the article representation returned over HTTP", () => {
    expect(articleResponseSchema.parse(article)).toEqual(article);
    expect(articlesResponseSchema.parse({ articles: [article] })).toEqual({ articles: [article] });
  });

  it("rejects an invalid status returned by the API", () => {
    expect(() => articleResponseSchema.parse({ ...article, status: "archived" })).toThrow();
  });

  it("enforces the write-side field limits", () => {
    expect(() => articleInputSchema.parse({ ...article, title: "" })).toThrow();
    expect(() => articleInputSchema.parse({ ...article, slug: "Not URL Safe" })).toThrow();
  });
});
