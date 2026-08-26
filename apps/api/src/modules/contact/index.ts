import type { ApiModule } from "../../shared/module.js";
import { createContactRoutes } from "./routes.js";
import { createInquiryService, type InquiryServiceDependencies } from "./service.js";

export type ContactModuleDependencies = InquiryServiceDependencies;

/** Inquiries raised from the website's contact form. */
export function createContactModule(dependencies: ContactModuleDependencies): ApiModule {
  return {
    name: "contact",
    basePath: "/contact",
    routes: createContactRoutes(createInquiryService(dependencies)),
  };
}
