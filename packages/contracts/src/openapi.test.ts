import { describe, expect, it } from "vitest";

import { openApiDocument } from "./openapi.js";

describe("OpenAPI document", () => {
  it("describes every public application route", () => {
    expect(openApiDocument.openapi).toBe("3.1.0");
    expect(Object.keys(openApiDocument.paths)).toEqual([
      "/health",
      "/health/ready",
      "/contact/inquiries",
      "/api/content/articles",
      "/api/content/articles/{slug}",
      "/api/content/admin/articles",
      "/api/content/admin/articles/{id}",
      "/api/content/admin/access",
    ]);
  });

  it("references executable schemas instead of duplicating response shapes", () => {
    expect(
      openApiDocument.paths["/api/content/articles"].get.responses["200"].content[
        "application/json"
      ].schema,
    ).toEqual({ $ref: "#/components/schemas/ArticlesResponse" });
  });
});
