import { describe, expect, it, vi } from "vitest";

import { createAuthModule } from "./index.js";

describe("createAuthModule", () => {
  it("forwards the raw request to Better Auth under /api/auth", async () => {
    const handler = vi.fn(async (request: Request) =>
      Response.json({ path: new URL(request.url).pathname }),
    );
    const module = createAuthModule({ handler });

    const response = await module.routes.request("/get-session");

    expect(module.basePath).toBe("/api/auth");
    expect(handler).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({ path: "/get-session" });
  });
});
