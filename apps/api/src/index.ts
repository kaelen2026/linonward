import { serve } from "@hono/node-server";

import { createApiApp, createDefaultDependencies } from "./composition.js";
import { loadApiConfig } from "./config.js";

const config = loadApiConfig(process.env);
const dependencies = await createDefaultDependencies(config);

console.log(
  `Storage: ${config.databaseUrl ? "postgres" : "in-memory"}; ` +
    `rate limiter: ${config.redisUrl ? "redis" : "in-memory"}`,
);

const server = serve(
  { fetch: createApiApp(config, dependencies).fetch, hostname: config.host, port: config.port },
  (info) => console.log(`API listening on http://${config.host}:${info.port}`),
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    // Stop accepting connections first, then hand the pools back, so an
    // in-flight insert is not cut off mid-transaction.
    server.close(() => {
      void dependencies.close().then(() => process.exit(0));
    });
  });
}
