import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const clientRoots = ["apps/web", "apps/www", "apps/h5"];
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const importPattern = /(?:from\s+|import\s*\(|require\s*\()\s*["']([^"']+)["']/g;

export function importViolation(file, specifier) {
  if (clientRoots.some((root) => file.startsWith(`${root}/`)) && specifier === "@linonward/db") {
    return "client-imports-db";
  }
  if (
    file.startsWith("packages/contracts/") &&
    (specifier === "hono" ||
      specifier === "drizzle-orm" ||
      specifier === "react" ||
      specifier === "next" ||
      specifier.startsWith("@linonward/db") ||
      specifier.startsWith("@/"))
  ) {
    return "contract-imports-runtime";
  }
  return undefined;
}

export function sourceViolation(file, source) {
  if (
    file.startsWith("apps/web/src/") &&
    file !== "apps/web/src/lib/api.ts" &&
    /\bfetch\s*\(/.test(source)
  ) {
    return "web-direct-fetch";
  }
  return undefined;
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => entry.name !== "node_modules" && entry.name !== "dist")
      .map(async (entry) => {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) return sourceFiles(target);
        return sourceExtensions.has(path.extname(entry.name)) ? [target] : [];
      }),
  );
  return nested.flat();
}

async function manifestViolations() {
  const violations = [];
  for (const workspace of clientRoots) {
    const manifest = JSON.parse(
      await readFile(path.join(repositoryRoot, workspace, "package.json")),
    );
    const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
    if (dependencies["@linonward/db"]) {
      violations.push({
        file: `${workspace}/package.json`,
        specifier: "@linonward/db",
        rule: "client-imports-db",
      });
    }
  }
  return violations;
}

export async function architectureViolations() {
  const roots = [...clientRoots, "packages/contracts"];
  const files = (
    await Promise.all(roots.map((root) => sourceFiles(path.join(repositoryRoot, root))))
  ).flat();
  const violations = await manifestViolations();

  for (const absoluteFile of files) {
    const file = path.relative(repositoryRoot, absoluteFile);
    const source = await readFile(absoluteFile, "utf8");
    const directSourceRule = sourceViolation(file, source);
    if (directSourceRule) {
      violations.push({ file, specifier: "fetch", rule: directSourceRule });
    }
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      if (!specifier) continue;
      const rule = importViolation(file, specifier);
      if (rule) violations.push({ file, specifier, rule });
    }
  }
  return violations;
}
