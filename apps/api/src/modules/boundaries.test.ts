import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const modulesDir = fileURLToPath(new URL(".", import.meta.url));
const sharedDir = path.join(path.dirname(modulesDir), "shared");

const relativeImport = /\bfrom\s+"(\.[^"]*)"/g;

type Violation = {
  file: string;
  imports: string;
};

function moduleSources(): { file: string; module: string }[] {
  return (
    readdirSync(modulesDir, { encoding: "utf8", recursive: true })
      .filter((entry) => entry.endsWith(".ts"))
      // Tests may reach for the composition root to mount the module under the
      // real error handler; the rule below is about how shipped code couples.
      .filter((entry) => !entry.endsWith(".test.ts"))
      .map((entry) => ({
        file: path.join(modulesDir, entry),
        module: entry.split(path.sep)[0] ?? "",
      }))
  );
}

function crossModuleImports(): Violation[] {
  const violations: Violation[] = [];

  for (const { file, module } of moduleSources()) {
    const ownDir = path.join(modulesDir, module);
    const source = readFileSync(file, "utf8");

    for (const [, specifier] of source.matchAll(relativeImport)) {
      const target = path.resolve(path.dirname(file), specifier as string);
      const staysHome = target.startsWith(`${ownDir}${path.sep}`);
      const usesSharedKernel = target.startsWith(`${sharedDir}${path.sep}`);

      if (!staysHome && !usesSharedKernel) {
        violations.push({
          file: path.relative(modulesDir, file),
          imports: specifier as string,
        });
      }
    }
  }

  return violations;
}

describe("module boundaries", () => {
  it("finds the module sources it is meant to police", () => {
    expect(moduleSources().length).toBeGreaterThan(0);
  });

  it("keeps every module importing only itself and the shared kernel", () => {
    // The whole point of a modular monolith: one process, but no module may
    // reach into another's service, repository, or schema. Cross-module work
    // goes through the composition root instead.
    expect(crossModuleImports()).toEqual([]);
  });

  it("keeps module entry points free of HTTP and persistence implementation details", () => {
    const contentEntry = readFileSync(path.join(modulesDir, "content", "index.ts"), "utf8");

    expect(contentEntry).not.toMatch(/from "(?:hono|drizzle-orm)"/);
    expect(contentEntry).not.toContain("../../shared/database.js");
  });

  it("keeps content HTTP routes free of persistence implementation details", () => {
    const contentRoutes = readFileSync(path.join(modulesDir, "content", "routes.ts"), "utf8");

    expect(contentRoutes).not.toContain('from "drizzle-orm"');
    expect(contentRoutes).not.toContain("../../shared/database.js");
  });

  it("keeps content application services behind their repository port", () => {
    const contentService = readFileSync(path.join(modulesDir, "content", "service.ts"), "utf8");
    const contentRepository = readFileSync(
      path.join(modulesDir, "content", "repository.ts"),
      "utf8",
    );

    expect(contentService).not.toContain('from "drizzle-orm"');
    expect(contentService).not.toContain("../../shared/database.js");
    expect(contentService).not.toContain("./postgres-repository.js");
    expect(contentRepository).not.toContain('from "drizzle-orm"');
    expect(contentRepository).not.toContain("../../shared/database.js");
  });
});
