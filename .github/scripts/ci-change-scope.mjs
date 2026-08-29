import { pathToFileURL } from "node:url";

const ALL_SCOPES = ["verify", "integration", "android", "harmony", "ios", "e2e"];

const ROOT_NODE_INPUTS = new Set([
  ".nvmrc",
  ".lintstagedrc.mjs",
  "biome.json",
  "commitlint.config.mjs",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
]);

const SHARED_INSTALL_INPUTS = new Set([
  ".nvmrc",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
]);

function startsWithAny(path, prefixes) {
  return prefixes.some((prefix) => path.startsWith(prefix));
}

export function classifyChanges(paths) {
  const scopes = Object.fromEntries(ALL_SCOPES.map((scope) => [scope, false]));

  for (const path of paths) {
    const controlsRouting =
      path === ".github/workflows/ci.yml" ||
      path === ".github/scripts/ci-change-scope.mjs" ||
      path === ".github/scripts/ci-change-scope.test.mjs";

    if (controlsRouting) {
      for (const scope of ALL_SCOPES) {
        scopes[scope] = true;
      }
      continue;
    }

    const changesNodeWorkspace =
      ROOT_NODE_INPUTS.has(path) ||
      path.startsWith("packages/") ||
      (path.startsWith("apps/") &&
        !startsWithAny(path, ["apps/android/", "apps/ios/", "apps/harmony/"])) ||
      path.startsWith(".github/scripts/");
    scopes.verify ||= changesNodeWorkspace;

    scopes.integration ||=
      SHARED_INSTALL_INPUTS.has(path) ||
      path === "compose.yml" ||
      startsWithAny(path, [
        "apps/api/",
        "packages/contracts/",
        "packages/db/",
        "packages/typescript-config/",
      ]);

    scopes.e2e ||=
      SHARED_INSTALL_INPUTS.has(path) ||
      path === "turbo.json" ||
      startsWithAny(path, [
        "apps/web/",
        "apps/www/",
        "packages/contracts/",
        "packages/typescript-config/",
      ]);

    scopes.ios ||= path.startsWith("apps/ios/");
    scopes.android ||= path.startsWith("apps/android/");
    scopes.harmony ||= path.startsWith("apps/harmony/") || path === "scripts/harmony-ci.sh";
  }

  return scopes;
}

async function readStdin() {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  return input;
}

async function main() {
  const paths = (await readStdin())
    .split("\n")
    .map((path) => path.trim())
    .filter(Boolean);
  const scopes = classifyChanges(paths);

  for (const scope of ALL_SCOPES) {
    console.log(`${scope}=${scopes[scope]}`);
  }
}

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  await main();
}
