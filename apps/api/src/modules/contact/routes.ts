import { zValidator } from "@hono/zod-validator";
import { Hono, type MiddlewareHandler } from "hono";

import { ApiError } from "../../shared/api-error.js";
import type { AppEnv } from "../../shared/module.js";
import { inquiryInputSchema } from "./schema.js";
import type { InquiryService } from "./service.js";

export function createContactRoutes(
  service: InquiryService,
  throttle: MiddlewareHandler<AppEnv>,
): Hono<AppEnv> {
  return new Hono<AppEnv>()
    .post(
      "/inquiries",
      // Throttled before validation, so a flood costs a counter increment
      // rather than a schema parse.
      throttle,
      // Without the hook, the validator answers with its own body shape and the
      // API would have two different error formats.
      zValidator("json", inquiryInputSchema, (result) => {
        if (!result.success) {
          throw new ApiError(
            400,
            "invalid_request",
            "The inquiry is not valid",
            result.error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          );
        }
      }),
      async (c) => {
        const inquiry = await service.submit(c.req.valid("json"));
        // Derived from the request path, so the module stays agnostic about
        // where the composition root mounted it.
        c.header("Location", `${c.req.path}/${inquiry.id}`);
        return c.json(inquiry, 201);
      },
    )
    .get("/inquiries/:id", async (c) => c.json(await service.get(c.req.param("id"))));
}
