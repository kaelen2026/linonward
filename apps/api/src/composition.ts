import { randomUUID } from "node:crypto";
import type { Hono } from "hono";

import { createApp } from "./app.js";
import type { ApiConfig } from "./config.js";
import { createContactModule } from "./modules/contact/index.js";
import {
  createInMemoryInquiryRepository,
  type InquiryRepository,
} from "./modules/contact/repository.js";
import { createHealthModule } from "./modules/health/index.js";
import type { ApiModule, AppEnv } from "./shared/module.js";

/**
 * Everything the modules need from the outside world, in one place. Time, ids,
 * and storage are injected rather than reached for, which is what makes a
 * module testable without a server or a database.
 */
export type ApiDependencies = {
  version: string;
  startedAt: Date;
  clock: () => Date;
  nextId: () => string;
  inquiries: InquiryRepository;
};

export function createDefaultDependencies(config: ApiConfig): ApiDependencies {
  const clock = () => new Date();

  return {
    version: config.version,
    startedAt: clock(),
    clock,
    nextId: () => `inq_${randomUUID()}`,
    inquiries: createInMemoryInquiryRepository(),
  };
}

/** The mount table. Adding a module to the monolith means adding a line here. */
export function createApiModules(dependencies: ApiDependencies): ApiModule[] {
  return [
    createHealthModule({
      version: dependencies.version,
      startedAt: dependencies.startedAt,
      clock: dependencies.clock,
    }),
    createContactModule({
      repository: dependencies.inquiries,
      clock: dependencies.clock,
      nextId: dependencies.nextId,
    }),
  ];
}

export function createApiApp(
  config: ApiConfig,
  dependencies: ApiDependencies = createDefaultDependencies(config),
): Hono<AppEnv> {
  return createApp({
    modules: createApiModules(dependencies),
    allowedOrigins: config.allowedOrigins,
  });
}
