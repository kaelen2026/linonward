export const BRIDGE_PROTOCOL = { major: 1, minor: 0 } as const;
export const BRIDGE_CAPABILITIES = [
  "article.set",
  "reader.settings",
  "reader.height",
  "article.link",
  "article.image",
] as const;

export type BridgeCapability = (typeof BRIDGE_CAPABILITIES)[number];
export type Theme = "light" | "dark" | "system";

export interface ArticleImage {
  alt: string;
  caption?: string;
  url: string;
}

export interface Article {
  author?: string;
  contentHtml: string;
  cover?: ArticleImage;
  id: string;
  publishedAt?: string;
  readingMinutes?: number;
  title: string;
}

export interface ReaderSettings {
  fontScale?: number;
  locale?: string;
  theme?: Theme;
}

export interface ArticlePayload {
  article: Article;
  settings?: ReaderSettings;
}

export interface ProtocolVersion {
  major: number;
  minor: number;
}

interface NativeEnvelope<TType extends string, TPayload> {
  payload: TPayload;
  sessionId: string;
  type: TType;
}

export type NativeMessage =
  | NativeEnvelope<
      "bridge:welcome",
      { capabilities: BridgeCapability[]; protocol: ProtocolVersion }
    >
  | NativeEnvelope<"article:set", ArticlePayload>
  | NativeEnvelope<"reader:settings", ReaderSettings>;

interface WebEnvelope<TType extends string, TPayload> {
  payload: TPayload;
  sessionId?: string;
  type: TType;
}

export type WebMessage =
  | WebEnvelope<
      "bridge:hello",
      { capabilities: readonly BridgeCapability[]; protocol: ProtocolVersion }
    >
  | WebEnvelope<"reader:ready", { protocol: ProtocolVersion }>
  | WebEnvelope<"reader:height", { height: number }>
  | WebEnvelope<"reader:error", { code: string; message: string }>
  | WebEnvelope<"article:link", { href: string }>
  | WebEnvelope<"article:image", { alt: string; src: string }>;
