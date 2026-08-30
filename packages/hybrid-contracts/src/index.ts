export const HYBRID_PROTOCOL = { major: 1, minor: 0 } as const;

export const HYBRID_CAPABILITIES = [
  "article.set",
  "reader.settings",
  "reader.height",
  "article.link",
  "article.image",
] as const;

export const HYBRID_MAX_MESSAGE_BYTES = 1_000_000;
export const HYBRID_SESSION_ID_MIN_LENGTH = 16;
export const HYBRID_SESSION_ID_MAX_LENGTH = 128;

export type HybridCapability = (typeof HYBRID_CAPABILITIES)[number];
export type HybridTheme = "light" | "dark" | "system";

export interface HybridArticleImage {
  alt: string;
  caption?: string;
  url: string;
}

export interface HybridArticle {
  author?: string;
  contentHtml: string;
  cover?: HybridArticleImage;
  id: string;
  publishedAt?: string;
  readingMinutes?: number;
  title: string;
}

export interface HybridReaderSettings {
  fontScale?: number;
  locale?: string;
  theme?: HybridTheme;
}

export interface HybridArticlePayload {
  article: HybridArticle;
  settings?: HybridReaderSettings;
}

export interface HybridProtocolVersion {
  major: number;
  minor: number;
}

export interface HybridOfflineAsset {
  path: string;
  sha256: string;
  size: number;
}

export interface HybridOfflineManifest {
  artifactVersion: string;
  entrypoint: "index.html";
  files: HybridOfflineAsset[];
  protocol: HybridProtocolVersion;
  schemaVersion: 1;
}

export interface HybridReleaseChannel {
  artifactVersion: string;
  manifestUrl: string;
  minimumAppVersion?: string;
  releaseName: string;
  rolloutPercentage: number;
  schemaVersion: 1;
}

export function isHybridOfflineManifest(value: unknown): value is HybridOfflineManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Partial<HybridOfflineManifest>;
  return (
    manifest.schemaVersion === 1 &&
    manifest.entrypoint === "index.html" &&
    typeof manifest.artifactVersion === "string" &&
    /^[a-f0-9]{64}$/.test(manifest.artifactVersion) &&
    manifest.protocol?.major === HYBRID_PROTOCOL.major &&
    typeof manifest.protocol.minor === "number" &&
    manifest.protocol.minor >= 0 &&
    Array.isArray(manifest.files) &&
    manifest.files.length > 0 &&
    manifest.files.every(
      (file) =>
        typeof file.path === "string" &&
        file.path.length > 0 &&
        !file.path.startsWith("/") &&
        !file.path.includes("..") &&
        /^[a-f0-9]{64}$/.test(file.sha256) &&
        Number.isSafeInteger(file.size) &&
        file.size >= 0,
    )
  );
}

export function isHybridReleaseChannel(value: unknown): value is HybridReleaseChannel {
  if (!value || typeof value !== "object") return false;
  const channel = value as Partial<HybridReleaseChannel>;
  if (
    channel.schemaVersion !== 1 ||
    typeof channel.artifactVersion !== "string" ||
    !/^[a-f0-9]{64}$/.test(channel.artifactVersion) ||
    typeof channel.releaseName !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(channel.releaseName) ||
    typeof channel.rolloutPercentage !== "number" ||
    !Number.isInteger(channel.rolloutPercentage) ||
    channel.rolloutPercentage < 0 ||
    channel.rolloutPercentage > 100 ||
    (channel.minimumAppVersion !== undefined && !/^\d+\.\d+\.\d+$/.test(channel.minimumAppVersion))
  ) {
    return false;
  }
  if (typeof channel.manifestUrl !== "string") return false;
  const match = /^https:\/\/([^/?#]+)(\/[^?#]*)$/.exec(channel.manifestUrl);
  if (!match || match[1]?.includes("@")) return false;
  return match[2]?.endsWith(`/releases/${channel.artifactVersion}/hybrid-manifest.json`) === true;
}

interface NativeEnvelope<TType extends string, TPayload> {
  payload: TPayload;
  sessionId: string;
  type: TType;
}

export type HybridNativeMessage =
  | NativeEnvelope<
      "bridge:welcome",
      { capabilities: HybridCapability[]; protocol: HybridProtocolVersion }
    >
  | NativeEnvelope<"article:set", HybridArticlePayload>
  | NativeEnvelope<"reader:settings", HybridReaderSettings>;

interface WebEnvelope<TType extends string, TPayload> {
  payload: TPayload;
  sessionId?: string;
  type: TType;
}

export type HybridWebMessage =
  | WebEnvelope<
      "bridge:hello",
      { capabilities: readonly HybridCapability[]; protocol: HybridProtocolVersion }
    >
  | WebEnvelope<"reader:ready", { protocol: HybridProtocolVersion }>
  | WebEnvelope<"reader:height", { height: number }>
  | WebEnvelope<"reader:error", { code: string; message: string }>
  | WebEnvelope<"article:link", { href: string }>
  | WebEnvelope<"article:image", { alt: string; src: string }>;

export function negotiateHybridProtocol(
  offered: HybridProtocolVersion,
  capabilities: readonly string[],
) {
  if (
    offered.major !== HYBRID_PROTOCOL.major ||
    !Number.isInteger(offered.minor) ||
    offered.minor < 0
  ) {
    return undefined;
  }

  const supported = new Set<string>(HYBRID_CAPABILITIES);
  return {
    capabilities: capabilities.filter((capability): capability is HybridCapability =>
      supported.has(capability),
    ),
    protocol: {
      major: HYBRID_PROTOCOL.major,
      minor: Math.min(offered.minor, HYBRID_PROTOCOL.minor),
    },
  };
}
