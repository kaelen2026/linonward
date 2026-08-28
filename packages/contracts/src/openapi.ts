/**
 * The public HTTP contract. It deliberately lives beside the Zod DTOs so a
 * deploy can expose one immutable description without a framework-specific
 * generator in the request path.
 */
export const openApiDocument = {
  openapi: "3.1.0",
  info: { title: "LinOnward API", version: "0.0.0" },
  paths: {
    "/health": {
      get: {
        operationId: "getHealth",
        responses: { "200": { description: "Service liveness and version" } },
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
    "/contact": {
      post: {
        operationId: "createInquiry",
        responses: {
          "201": { description: "Inquiry accepted" },
          "400": { description: "Invalid request" },
          "429": { description: "Rate limited" },
        },
      },
    },
  },
} as const;
