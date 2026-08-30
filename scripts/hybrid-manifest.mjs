import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const HYBRID_MANIFEST_FILE = "hybrid-manifest.json";

async function assetFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await assetFiles(root, absolute)));
    } else if (entry.isFile()) {
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      if (relative !== HYBRID_MANIFEST_FILE) files.push(relative);
    }
  }
  return files.sort();
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export async function createHybridManifest(root, protocol = { major: 1, minor: 0 }) {
  const files = [];
  for (const relativePath of await assetFiles(root)) {
    const contents = await readFile(path.join(root, relativePath));
    files.push({ path: relativePath, sha256: sha256(contents), size: contents.byteLength });
  }
  if (!files.some((file) => file.path === "index.html")) {
    throw new Error("H5 build did not produce index.html");
  }
  const artifactVersion = sha256(
    files.map((file) => `${file.path}\0${file.sha256}\0${file.size}`).join("\n"),
  );
  return {
    artifactVersion,
    entrypoint: "index.html",
    files,
    protocol,
    schemaVersion: 1,
  };
}

export async function writeHybridManifest(root, protocol) {
  const manifest = await createHybridManifest(root, protocol);
  await writeFile(path.join(root, HYBRID_MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2];
  if (!root) throw new Error("Usage: node scripts/hybrid-manifest.mjs <asset-directory>");
  await writeHybridManifest(path.resolve(root));
}
