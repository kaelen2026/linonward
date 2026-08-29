import DOMPurify from "dompurify";
import type { ArticlePayload, ReaderSettings } from "./types";

const ALLOWED_TAGS = [
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "figcaption",
  "figure",
  "h2",
  "h3",
  "h4",
  "hr",
  "i",
  "img",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "s",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
];

export function sanitizeArticleHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_ATTR: [
      "alt",
      "colspan",
      "height",
      "href",
      "loading",
      "rowspan",
      "src",
      "title",
      "width",
    ],
    ALLOWED_TAGS,
    FORBID_ATTR: ["style"],
  });
}

export function isArticlePayload(value: unknown): value is ArticlePayload {
  if (!value || typeof value !== "object" || !("article" in value)) return false;
  const article = (value as { article?: unknown }).article;
  if (!article || typeof article !== "object") return false;
  const candidate = article as Record<string, unknown>;
  const hasRequiredFields =
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    candidate.id.length <= 200 &&
    typeof candidate.title === "string" &&
    candidate.title.length > 0 &&
    candidate.title.length <= 500 &&
    typeof candidate.contentHtml === "string" &&
    candidate.contentHtml.length <= 750_000;
  if (!hasRequiredFields) return false;

  if (
    candidate.author !== undefined &&
    (typeof candidate.author !== "string" || candidate.author.length > 300)
  ) {
    return false;
  }
  if (
    candidate.publishedAt !== undefined &&
    (typeof candidate.publishedAt !== "string" || candidate.publishedAt.length > 100)
  ) {
    return false;
  }
  if (
    candidate.readingMinutes !== undefined &&
    (typeof candidate.readingMinutes !== "number" ||
      !Number.isInteger(candidate.readingMinutes) ||
      candidate.readingMinutes < 1 ||
      candidate.readingMinutes > 10_000)
  ) {
    return false;
  }

  if (candidate.cover !== undefined) {
    if (!candidate.cover || typeof candidate.cover !== "object") return false;
    const cover = candidate.cover as Record<string, unknown>;
    if (typeof cover.url !== "string" || !isSafeMediaURL(cover.url)) return false;
    if (typeof cover.alt !== "string" || cover.alt.length > 500) return false;
    if (
      cover.caption !== undefined &&
      (typeof cover.caption !== "string" || cover.caption.length > 1_000)
    ) {
      return false;
    }
  }
  return true;
}

function isSafeMediaURL(value: string) {
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === "https:" || url.origin === window.location.origin;
  } catch {
    return false;
  }
}

export function normalizeSettings(settings?: ReaderSettings): Required<ReaderSettings> {
  const requestedScale = settings?.fontScale ?? 1;
  return {
    fontScale: Math.min(1.3, Math.max(0.85, requestedScale)),
    locale: settings?.locale || "zh-CN",
    theme: settings?.theme ?? "system",
  };
}

export function formatPublishedAt(value: string | undefined, locale: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
