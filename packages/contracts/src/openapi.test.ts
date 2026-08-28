import { describe, expect, it } from "vitest";

import { openApiDocument } from "./openapi.js";

describe("OpenAPI document", () => {
  it("describes every public application route", () => {
    expect(openApiDocument.openapi).toBe("3.1.0");
    expect(Object.keys(openApiDocument.paths)).toEqual(["/health", "/health/ready", "/contact"]);
  });
});
