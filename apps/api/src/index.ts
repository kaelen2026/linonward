import { serve } from "@hono/node-server";

import { createApiApp } from "./composition.js";
import { loadApiConfig } from "./config.js";

const config = loadApiConfig(process.env);

serve({ fetch: createApiApp(config).fetch, hostname: config.host, port: config.port }, (info) => {
  console.log(`API listening on http://${config.host}:${info.port}`);
});
