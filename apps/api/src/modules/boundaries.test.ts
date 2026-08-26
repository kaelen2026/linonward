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
});
