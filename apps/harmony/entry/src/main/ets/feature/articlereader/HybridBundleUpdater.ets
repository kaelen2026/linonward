import { fileIo } from '@kit.CoreFileKit';
import { cryptoFramework } from '@kit.CryptoArchitectureKit';
import http from '@ohos.net.http';
import util from '@ohos.util';

const MAX_FILES: number = 512;
const MAX_BYTES: number = 50000000;
const MAX_METADATA_BYTES: number = 256000;
const HASH_PATTERN: RegExp = /^[a-f0-9]{64}$/;
const RELEASE_PATTERN: RegExp = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const PATH_PATTERN: RegExp = /^[A-Za-z0-9._/-]+$/;

export interface HybridReleaseChannel {
  artifactVersion: string;
  manifestUrl: string;
  minimumAppVersion?: string;
  releaseName: string;
  rolloutPercentage: number;
  schemaVersion: number;
}

export interface HybridAsset {
  path: string;
  sha256: string;
  size: number;
}

export interface HybridOfflineManifest {
  artifactVersion: string;
  entrypoint: string;
  files: HybridAsset[];
  protocol: HybridProtocolVersion;
  schemaVersion: number;
}

export interface HybridProtocolVersion {
  major: number;
  minor: number;
}

export interface HybridFetcher {
  fetch(url: string): Promise<ArrayBuffer>;
}

export class HttpHybridFetcher implements HybridFetcher {
  async fetch(url: string): Promise<ArrayBuffer> {
    const client = http.createHttp();
    try {
      const response = await client.request(url, {
        method: http.RequestMethod.GET,
        expectDataType: http.HttpDataType.ARRAY_BUFFER,
        connectTimeout: 10000,
        readTimeout: 20000
      });
      if (response.responseCode !== 200 || !(response.result instanceof ArrayBuffer)) {
        throw new Error('hybrid_invalid_response');
      }
      return response.result;
    } finally {
      client.destroy();
    }
  }
}

export class HybridBundleStore {
  static root(cacheDir: string): string {
    return `${cacheDir}/hybrid-article-reader`;
  }

  static async activeIndex(cacheDir: string): Promise<string | undefined> {
    const root = HybridBundleStore.root(cacheDir);
    const pointer = `${root}/active-version`;
    if (!await fileIo.access(pointer)) return undefined;
    const version = (await fileIo.readText(pointer)).trim();
    if (!HASH_PATTERN.test(version)) return undefined;
    const index = `${root}/releases/${version}/index.html`;
    return await fileIo.access(index) ? `file://${index}` : undefined;
  }

  static async deactivate(cacheDir: string): Promise<void> {
    const pointer = `${HybridBundleStore.root(cacheDir)}/active-version`;
    if (await fileIo.access(pointer)) await fileIo.unlink(pointer);
  }
}

export class HybridBundleUpdater {
  private root: string;
  private fetcher: HybridFetcher;

  constructor(root: string, fetcher: HybridFetcher = new HttpHybridFetcher()) {
    this.root = root;
    this.fetcher = fetcher;
  }

  async refresh(channelUrl: string, appVersion: string, rolloutSeed: string): Promise<void> {
    if (!secureUrl(channelUrl)) throw new Error('hybrid_invalid_channel');
    const channelData = await this.fetcher.fetch(channelUrl);
    if (channelData.byteLength > MAX_METADATA_BYTES) throw new Error('hybrid_invalid_channel');
    const channel = JSON.parse(decode(channelData)) as HybridReleaseChannel;
    validateChannel(channel, channelUrl, appVersion, rolloutSeed);

    const manifestData = await this.fetcher.fetch(channel.manifestUrl);
    if (manifestData.byteLength > MAX_METADATA_BYTES) throw new Error('hybrid_invalid_manifest');
    const manifest = JSON.parse(decode(manifestData)) as HybridOfflineManifest;
    await validateManifest(manifest, channel.artifactVersion);
    const release = `${this.root}/releases/${manifest.artifactVersion}`;
    if (await fileIo.access(release) && !await verifyRelease(manifest, release)) {
      await removeTree(release);
    }
    if (!await fileIo.access(release)) {
      await this.download(manifest, channel.manifestUrl, manifestData, release);
    }
    await this.activate(manifest.artifactVersion);
  }

  private async download(
    manifest: HybridOfflineManifest,
    manifestUrl: string,
    manifestData: ArrayBuffer,
    release: string
  ): Promise<void> {
    const staging = `${this.root}/staging-${manifest.artifactVersion}`;
    if (await fileIo.access(staging)) await removeTree(staging);
    await fileIo.mkdir(staging, true);
    try {
      const base = manifestUrl.substring(0, manifestUrl.lastIndexOf('/') + 1);
      for (const asset of manifest.files) {
        const data = await this.fetcher.fetch(`${base}${asset.path}`);
        if (data.byteLength !== asset.size || await sha256(data) !== asset.sha256) {
          throw new Error('hybrid_invalid_manifest');
        }
        const destination = `${staging}/${asset.path}`;
        await fileIo.mkdir(destination.substring(0, destination.lastIndexOf('/')), true);
        await write(destination, data);
      }
      await write(`${staging}/hybrid-manifest.json`, manifestData);
      await fileIo.mkdir(`${this.root}/releases`, true);
      await fileIo.rename(staging, release);
    } catch (error) {
      if (await fileIo.access(staging)) await removeTree(staging);
      throw new Error((error as Error).message);
    }
  }

  private async activate(version: string): Promise<void> {
    await fileIo.mkdir(this.root, true);
    const temporary = `${this.root}/active-version.tmp`;
    await write(temporary, encode(`${version}\n`));
    const pointer = `${this.root}/active-version`;
    if (await fileIo.access(pointer)) await fileIo.unlink(pointer);
    await fileIo.rename(temporary, pointer);
  }
}

export async function hybridRolloutSeed(cacheDir: string): Promise<string> {
  const path = `${HybridBundleStore.root(cacheDir)}/rollout-seed`;
  if (await fileIo.access(path)) return (await fileIo.readText(path)).trim();
  const seed = `${Date.now()}-${Math.random()}`;
  await fileIo.mkdir(HybridBundleStore.root(cacheDir), true);
  await write(path, encode(seed));
  return seed;
}

export function validateChannel(
  channel: HybridReleaseChannel,
  channelUrl: string,
  appVersion: string,
  rolloutSeed: string
): void {
  if (channel.schemaVersion !== 1 || !HASH_PATTERN.test(channel.artifactVersion) ||
    !RELEASE_PATTERN.test(channel.releaseName) || channel.rolloutPercentage < 0 ||
    channel.rolloutPercentage > 100 || !secureUrl(channel.manifestUrl) ||
    origin(channelUrl) !== origin(channel.manifestUrl) ||
    !channel.manifestUrl.endsWith(`/releases/${channel.artifactVersion}/hybrid-manifest.json`)) {
    throw new Error('hybrid_invalid_channel');
  }
  if (channel.minimumAppVersion !== undefined && compareVersions(appVersion, channel.minimumAppVersion) < 0) {
    throw new Error('hybrid_incompatible_app');
  }
  if (rolloutBucket(rolloutSeed, channel.artifactVersion) >= channel.rolloutPercentage) {
    throw new Error('hybrid_not_in_rollout');
  }
}

export async function validateManifest(manifest: HybridOfflineManifest, expected: string): Promise<void> {
  if (manifest.protocol.major !== 1) throw new Error('hybrid_incompatible_protocol');
  const paths = new Set<string>(manifest.files.map((asset: HybridAsset) => asset.path));
  const size = manifest.files.reduce((total: number, asset: HybridAsset) => total + asset.size, 0);
  if (manifest.schemaVersion !== 1 || manifest.protocol.minor < 0 || manifest.artifactVersion !== expected ||
    manifest.entrypoint !== 'index.html' || manifest.files.length > MAX_FILES ||
    paths.size !== manifest.files.length || !paths.has('index.html') || size > MAX_BYTES ||
    !manifest.files.every(validAsset) || await artifactVersion(manifest.files) !== manifest.artifactVersion) {
    throw new Error('hybrid_invalid_manifest');
  }
}

function validAsset(asset: HybridAsset): boolean {
  return asset.path.length > 0 && !asset.path.startsWith('/') && !asset.path.includes('..') &&
    PATH_PATTERN.test(asset.path) && HASH_PATTERN.test(asset.sha256) && asset.size >= 0 && asset.size <= MAX_BYTES;
}

async function verifyRelease(manifest: HybridOfflineManifest, release: string): Promise<boolean> {
  for (const asset of manifest.files) {
    const path = `${release}/${asset.path}`;
    if (!await fileIo.access(path)) return false;
    const data = await read(path);
    if (data.byteLength !== asset.size || await sha256(data) !== asset.sha256) return false;
  }
  return true;
}

async function artifactVersion(files: HybridAsset[]): Promise<string> {
  const records = files.map((asset: HybridAsset) =>
    `${asset.path}\u0000${asset.sha256}\u0000${asset.size}`).join('\n');
  return sha256(encode(records));
}

async function sha256(data: ArrayBuffer): Promise<string> {
  const digest = cryptoFramework.createMd('SHA256');
  await digest.update({ data: new Uint8Array(data) });
  const result = await digest.digest();
  return Array.from(result.data).map((value: number) => value.toString(16).padStart(2, '0')).join('');
}

function rolloutBucket(seed: string, version: string): number {
  let value: number = 2166136261;
  const input = `${seed}:${version}`;
  for (let index = 0; index < input.length; index += 1) {
    value = Math.imul(value ^ input.charCodeAt(index), 16777619);
  }
  return (value >>> 0) % 100;
}

function compareVersions(left: string, right: string): number {
  const lhs = left.split('.').map((value: string) => Number.parseInt(value, 10) || 0);
  const rhs = right.split('.').map((value: string) => Number.parseInt(value, 10) || 0);
  for (let index = 0; index < Math.max(lhs.length, rhs.length); index += 1) {
    const difference = (lhs[index] ?? 0) - (rhs[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function secureUrl(value: string): boolean {
  return /^https:\/\/[A-Za-z0-9.-]+(?::443)?\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/.test(value);
}

function origin(value: string): string {
  const match = /^(https:\/\/[^/]+)/.exec(value);
  return match === null ? '' : match[1].toLowerCase().replace(/:443$/, '');
}

async function write(path: string, data: ArrayBuffer): Promise<void> {
  const file = await fileIo.open(path, fileIo.OpenMode.CREATE | fileIo.OpenMode.WRITE_ONLY | fileIo.OpenMode.TRUNC);
  try {
    await fileIo.write(file.fd, data);
  } finally {
    await fileIo.close(file);
  }
}

async function read(path: string): Promise<ArrayBuffer> {
  const file = await fileIo.open(path, fileIo.OpenMode.READ_ONLY);
  try {
    const stat = await fileIo.stat(path);
    const buffer = new ArrayBuffer(stat.size);
    await fileIo.read(file.fd, buffer);
    return buffer;
  } finally {
    await fileIo.close(file);
  }
}

async function removeTree(path: string): Promise<void> {
  const entries = await fileIo.listFile(path);
  for (const entry of entries) {
    const child = `${path}/${entry}`;
    if ((await fileIo.stat(child)).isDirectory()) {
      await removeTree(child);
    } else {
      await fileIo.unlink(child);
    }
  }
  await fileIo.rmdir(path);
}

function decode(data: ArrayBuffer): string {
  return util.TextDecoder.create('utf-8').decodeToString(new Uint8Array(data));
}

function encode(value: string): ArrayBuffer {
  const bytes = util.TextEncoder.create('utf-8').encodeInto(value);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
