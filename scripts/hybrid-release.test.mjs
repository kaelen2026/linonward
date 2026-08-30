import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { prepareHybridRelease } from "./hybrid-release.mjs";

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "linonward-hybrid-release-"));
  const sourceDirectory = path.join(root, "source");
  const outputDirectory = path.join(root, "publish");
  await mkdir(path.join(sourceDirectory, "assets"), { recursive: true });
  await writeFile(path.join(sourceDirectory, "index.html"), "<main>LinOnward</main>");
  await writeFile(path.join(sourceDirectory, "assets", "app.js"), "console.log('ready')");
  return { outputDirectory, sourceDirectory };
}

test("prepares an immutable release and atomically movable channel", async () => {
  const paths = await fixture();
  const first = await prepareHybridRelease({
    ...paths,
    minimumAppVersion: "1.2.0",
    publicBaseUrl: "https://cdn.example.com/hybrid",
    releaseName: "2026.08.30.1",
    rolloutPercentage: 10,
  });
  const channel = JSON.parse(
    await readFile(path.join(paths.outputDirectory, "channels", "production.json"), "utf8"),
  );

  assert.equal(channel.artifactVersion, first.manifest.artifactVersion);
  assert.equal(channel.rolloutPercentage, 10);
  assert.equal(
    channel.manifestUrl,
    `https://cdn.example.com/hybrid/releases/${first.manifest.artifactVersion}/hybrid-manifest.json`,
  );
  assert.equal(
    JSON.parse(await readFile(path.join(first.releaseDirectory, "hybrid-manifest.json"), "utf8"))
      .artifactVersion,
    first.manifest.artifactVersion,
  );

  const repeated = await prepareHybridRelease({
    ...paths,
    publicBaseUrl: "https://cdn.example.com/hybrid",
    releaseName: "2026.08.30.1",
  });
  assert.equal(repeated.releaseDirectory, first.releaseDirectory);
});

test("rejects insecure URLs and invalid rollout values", async () => {
  const paths = await fixture();
  await assert.rejects(
    prepareHybridRelease({
      ...paths,
      publicBaseUrl: "http://cdn.example.com/hybrid",
      releaseName: "release-1",
    }),
    /HTTPS/,
  );
  await assert.rejects(
    prepareHybridRelease({
      ...paths,
      publicBaseUrl: "https://cdn.example.com/hybrid",
      releaseName: "release-1",
      rolloutPercentage: 101,
    }),
    /rolloutPercentage/,
  );
});
