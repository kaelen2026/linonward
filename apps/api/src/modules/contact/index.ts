import type { MiddlewareHandler } from "hono";

import type { ApiModule, AppEnv } from "../../shared/module.js";
import { createContactRoutes } from "./routes.js";
import { createInquiryService, type InquiryServiceDependencies } from "./service.js";

export type ContactModuleDependencies = InquiryServiceDependencies & {
  /** Applied to submission only; reading an inquiry back is cheap. */
  throttle: MiddlewareHandler<AppEnv>;
};

/** Inquiries raised from the website's contact form. */
export function createContactModule({
  throttle,
  ...serviceDependencies
}: ContactModuleDependencies): ApiModule {
  return {
    name: "contact",
    basePath: "/contact",
    routes: createContactRoutes(createInquiryService(serviceDependencies), throttle),
  };
}
