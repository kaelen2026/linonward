import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const checker = new URL("../../scripts/check-harmony-signing-profile.sh", import.meta.url).pathname;

function git(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" });
}

function createRepository() {
  const root = mkdtempSync(join(tmpdir(), "linonward-harmony-profile-"));
  const harmony = join(root, "apps/harmony");
  mkdirSync(harmony, { recursive: true });
  git(root, "init", "--quiet");
  writeFileSync(join(harmony, ".gitignore"), "/build-profile.json5\n");
  writeFileSync(
    join(harmony, "build-profile.template.json5"),
    '{ "app": { "signingConfigs": [] } }\n',
  );
  git(root, "add", "apps/harmony/.gitignore", "apps/harmony/build-profile.template.json5");
  return { harmony, root };
}

function check(root) {
  return execFileSync(checker, { env: { ...process.env, HARMONY_PROFILE_REPO_ROOT: root } });
}

test("accepts an ignored local profile and an empty tracked template", () => {
  const { harmony, root } = createRepository();
  writeFileSync(join(harmony, "build-profile.json5"), '{ "app": { "signingConfigs": [] } }\n');
  assert.doesNotThrow(() => check(root));
});

test("rejects the active local profile when it is force-added", () => {
  const { harmony, root } = createRepository();
  writeFileSync(join(harmony, "build-profile.json5"), '{ "app": { "signingConfigs": [] } }\n');
  git(root, "add", "--force", "apps/harmony/build-profile.json5");
  assert.throws(() => check(root));
});

test("rejects signing secrets under alternate tracked filenames", () => {
  const { harmony, root } = createRepository();
  writeFileSync(join(harmony, "signing.json5"), '{ "storePassword": "secret" }\n');
  git(root, "add", "apps/harmony/signing.json5");
  assert.throws(() => check(root));
});

test("rejects unquoted and single-quoted JSON5 signing keys", () => {
  const { harmony, root } = createRepository();
  writeFileSync(
    join(harmony, "signing.json5"),
    "{ storePassword: 'synthetic', 'keyPassword': 'synthetic' }\n",
  );
  git(root, "add", "apps/harmony/signing.json5");
  assert.throws(() => check(root));
});

test("rejects signing files regardless of extension case", () => {
  const { harmony, root } = createRepository();
  writeFileSync(join(harmony, "developer.PEM"), "synthetic\n");
  git(root, "add", "apps/harmony/developer.PEM");
  assert.throws(() => check(root));
});

test("rejects a non-empty signing configuration without known secret field names", () => {
  const { harmony, root } = createRepository();
  writeFileSync(
    join(harmony, "build-profile.template.json5"),
    '{ "app": { "signingConfigs": [{ "name": "local" }] } }\n',
  );
  git(root, "add", "apps/harmony/build-profile.template.json5");
  assert.throws(() => check(root));
});

test("rejects any non-empty signing configuration array", () => {
  const { harmony, root } = createRepository();
  writeFileSync(
    join(harmony, "build-profile.template.json5"),
    '{ "app": { "signingConfigs": [\n      "synthetic"\n    ] } }\n',
  );
  git(root, "add", "apps/harmony/build-profile.template.json5");
  assert.throws(() => check(root));
});
