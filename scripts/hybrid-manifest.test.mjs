import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createHybridManifest, writeHybridManifest } from "./hybrid-manifest.mjs";

test("creates a deterministic manifest for the complete H5 artifact", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "linonward-hybrid-manifest-"));
  await mkdir(path.join(root, "assets"));
  await writeFile(path.join(root, "index.html"), "<main>LinOnward</main>");
  await writeFile(path.join(root, "assets", "app.js"), "console.log('ready')");

  const first = await createHybridManifest(root);
  await writeHybridManifest(root);
  const second = await createHybridManifest(root);

  assert.deepEqual(second, first);
  assert.equal(first.schemaVersion, 1);
  assert.deepEqual(first.protocol, { major: 1, minor: 0 });
  assert.deepEqual(
    first.files.map((file) => file.path),
    ["assets/app.js", "index.html"],
  );
  assert.match(first.artifactVersion, /^[a-f0-9]{64}$/);
  assert.equal(
    JSON.parse(await readFile(path.join(root, "hybrid-manifest.json"), "utf8")).artifactVersion,
    first.artifactVersion,
  );
});

test("rejects a bundle without its entrypoint", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "linonward-hybrid-manifest-"));
  await assert.rejects(createHybridManifest(root), /index\.html/);
});
