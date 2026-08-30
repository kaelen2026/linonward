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
