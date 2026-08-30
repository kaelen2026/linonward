import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHybridManifest, HYBRID_MANIFEST_FILE } from "./hybrid-manifest.mjs";

const channelPattern = /^[a-z][a-z0-9-]{0,31}$/;
const releaseNamePattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const appVersionPattern = /^\d+\.\d+\.\d+$/;

function normalizeBaseUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("publicBaseUrl must be an HTTPS URL without credentials, query, or fragment");
  }
  return url.toString().replace(/\/$/, "");
}

async function writeJsonAtomically(destination, value) {
  const temporary = `${destination}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  try {
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function assertExistingRelease(releaseDirectory, artifactVersion) {
  try {
    const manifest = JSON.parse(
      await readFile(path.join(releaseDirectory, HYBRID_MANIFEST_FILE), "utf8"),
    );
    const actual = await createHybridManifest(releaseDirectory);
    if (
      manifest.artifactVersion !== artifactVersion ||
      actual.artifactVersion !== artifactVersion
    ) {
      throw new Error("Existing immutable release does not match its artifact version");
    }
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

export async function prepareHybridRelease({
  channel = "production",
  minimumAppVersion,
  outputDirectory,
  publicBaseUrl,
  releaseName,
  rolloutPercentage = 100,
  sourceDirectory,
}) {
  if (!channelPattern.test(channel)) throw new Error("Invalid channel name");
  if (!releaseNamePattern.test(releaseName)) throw new Error("Invalid release name");
  if (minimumAppVersion !== undefined && !appVersionPattern.test(minimumAppVersion)) {
    throw new Error("minimumAppVersion must use major.minor.patch");
  }
  if (!Number.isInteger(rolloutPercentage) || rolloutPercentage < 0 || rolloutPercentage > 100) {
    throw new Error("rolloutPercentage must be an integer from 0 to 100");
  }

  const baseUrl = normalizeBaseUrl(publicBaseUrl);
  const manifest = await createHybridManifest(sourceDirectory);
  const releaseDirectory = path.join(outputDirectory, "releases", manifest.artifactVersion);
  const alreadyPublished = await assertExistingRelease(releaseDirectory, manifest.artifactVersion);
  if (!alreadyPublished) {
    await mkdir(path.dirname(releaseDirectory), { recursive: true });
    const stagingDirectory = `${releaseDirectory}.tmp`;
    await rm(stagingDirectory, { recursive: true, force: true });
    await cp(sourceDirectory, stagingDirectory, { recursive: true });
    await writeFile(
      path.join(stagingDirectory, HYBRID_MANIFEST_FILE),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { flag: "w" },
    );
    await rename(stagingDirectory, releaseDirectory);
  }

  const releaseChannel = {
    artifactVersion: manifest.artifactVersion,
    manifestUrl: `${baseUrl}/releases/${manifest.artifactVersion}/${HYBRID_MANIFEST_FILE}`,
    ...(minimumAppVersion === undefined ? {} : { minimumAppVersion }),
    releaseName,
    rolloutPercentage,
    schemaVersion: 1,
  };
  const channelDirectory = path.join(outputDirectory, "channels");
  await mkdir(channelDirectory, { recursive: true });
  await writeJsonAtomically(path.join(channelDirectory, `${channel}.json`), releaseChannel);
  return { channel: releaseChannel, manifest, releaseDirectory };
}

function parseArguments(arguments_) {
  const values = new Map();
  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index];
    const value = arguments_[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error("Invalid arguments");
    values.set(key.slice(2), value);
  }
  const required = ["source", "output", "public-base-url", "release-name"];
  for (const key of required) if (!values.has(key)) throw new Error(`Missing --${key}`);
  return {
    channel: values.get("channel") ?? "production",
    minimumAppVersion: values.get("minimum-app-version"),
    outputDirectory: path.resolve(values.get("output")),
    publicBaseUrl: values.get("public-base-url"),
    releaseName: values.get("release-name"),
    rolloutPercentage: Number(values.get("rollout-percentage") ?? "100"),
    sourceDirectory: path.resolve(values.get("source")),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await prepareHybridRelease(parseArguments(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(result.channel)}\n`);
}
