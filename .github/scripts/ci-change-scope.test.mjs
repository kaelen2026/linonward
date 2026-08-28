import assert from "node:assert/strict";
import test from "node:test";

import { classifyChanges } from "./ci-change-scope.mjs";

const none = {
  verify: false,
  integration: false,
  harmony: false,
  ios: false,
  e2e: false,
};

test("skips product jobs for documentation and agent skill changes", () => {
  assert.deepEqual(classifyChanges(["README.md", ".agents/skills/example/SKILL.md"]), none);
});

test("routes API changes to workspace and integration verification", () => {
  assert.deepEqual(classifyChanges(["apps/api/src/app.ts"]), {
    ...none,
    verify: true,
    integration: true,
  });
});

test("routes infrastructure composition changes to integration verification", () => {
  assert.deepEqual(classifyChanges(["compose.yml"]), {
    ...none,
    integration: true,
  });
});

test("routes web changes to workspace and browser verification", () => {
  assert.deepEqual(classifyChanges(["apps/www/src/app/page.tsx"]), {
    ...none,
    verify: true,
    e2e: true,
  });
});

test("routes iOS changes only to the macOS job", () => {
  assert.deepEqual(classifyChanges(["apps/ios/LinOnward/App.swift"]), {
    ...none,
    ios: true,
  });
});

test("routes HarmonyOS changes only to the self-hosted HarmonyOS job", () => {
  assert.deepEqual(classifyChanges(["apps/harmony/entry/src/main/ets/pages/Index.ets"]), {
    ...none,
    harmony: true,
  });
});

test("runs every product job when CI routing changes", () => {
  assert.deepEqual(classifyChanges([".github/workflows/ci.yml"]), {
    verify: true,
    integration: true,
    harmony: true,
    ios: true,
    e2e: true,
  });
});

test("routes shared Node dependency changes to the relevant jobs", () => {
  assert.deepEqual(classifyChanges(["package.json"]), {
    ...none,
    verify: true,
    integration: true,
    ios: true,
    e2e: true,
  });
});

test("routes root lint configuration only to workspace verification", () => {
  assert.deepEqual(classifyChanges([".lintstagedrc.mjs"]), {
    ...none,
    verify: true,
  });
});
