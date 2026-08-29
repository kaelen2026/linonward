import assert from "node:assert/strict";
import test from "node:test";

import {
  architectureViolations,
  importViolation,
  sourceViolation,
} from "./architecture-boundaries.mjs";

test("rejects database imports from client workspaces", () => {
  assert.equal(importViolation("apps/web/src/data.ts", "@linonward/db"), "client-imports-db");
  assert.equal(importViolation("apps/www/src/page.tsx", "@linonward/contracts/content"), undefined);
});

test("keeps the contract package independent of frameworks and storage", () => {
  assert.equal(
    importViolation("packages/contracts/src/example.ts", "hono"),
    "contract-imports-runtime",
  );
  assert.equal(
    importViolation("packages/contracts/src/example.ts", "drizzle-orm"),
    "contract-imports-runtime",
  );
  assert.equal(importViolation("packages/contracts/src/example.ts", "zod"), undefined);
});

test("allows apps/web HTTP requests only through its shared transport", () => {
  assert.equal(
    sourceViolation("apps/web/src/components/example.tsx", "fetch('/api/example')"),
    "web-direct-fetch",
  );
  assert.equal(sourceViolation("apps/web/src/lib/api.ts", "fetch('/api/example')"), undefined);
  assert.equal(
    sourceViolation("apps/www/src/components/example.tsx", "fetch('/api/example')"),
    undefined,
  );
});

test("the repository satisfies its architecture boundaries", async () => {
  assert.deepEqual(await architectureViolations(), []);
});
