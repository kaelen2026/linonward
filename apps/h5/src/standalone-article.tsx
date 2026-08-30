import type { Article as PublishedArticle } from "@linonward/contracts/content";
import { useEffect, useState } from "react";
import { App } from "./App";
import type { Bridge } from "./bridge";
import type { ArticlePayload } from "./types";

type RichTextNode = {
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  marks?: { attrs?: Record<string, unknown>; type?: string }[];
  text?: string;
  type?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderChildren(node: RichTextNode) {
  return (node.content ?? []).map(renderNode).join("");
}

function renderNode(node: RichTextNode): string {
  if (node.type === "text") {
    let result = escapeHtml(node.text ?? "");
    for (const mark of node.marks ?? []) {
      if (mark.type === "strong") result = `<strong>${result}</strong>`;
      if (mark.type === "em") result = `<em>${result}</em>`;
      if (mark.type === "code") result = `<code>${result}</code>`;
      if (mark.type === "link" && typeof mark.attrs?.href === "string") {
        result = `<a href="${escapeHtml(mark.attrs.href)}">${result}</a>`;
      }
    }
    return result;
  }

  const children = renderChildren(node);
  if (node.type === "paragraph") return `<p>${children}</p>`;
  if (node.type === "heading")
    return `<h${node.attrs?.level === 1 ? 2 : 3}>${children}</h${node.attrs?.level === 1 ? 2 : 3}>`;
  if (node.type === "blockquote") return `<blockquote>${children}</blockquote>`;
  if (node.type === "bullet_list") return `<ul>${children}</ul>`;
  if (node.type === "ordered_list") return `<ol>${children}</ol>`;
  if (node.type === "list_item") return `<li>${children}</li>`;
  if (node.type === "hard_break") return "<br>";
  return children;
}

export function richTextToHtml(document: unknown) {
  return renderChildren(document as RichTextNode);
}

function readingMinutes(document: unknown) {
  const count = (node: RichTextNode): number =>
    (node.text?.replace(/\s/g, "").length ?? 0) +
    (node.content ?? []).reduce((total, child) => total + count(child), 0);
  return Math.max(1, Math.ceil(count(document as RichTextNode) / 400));
}

export function toArticlePayload(article: PublishedArticle): ArticlePayload {
  return {
    article: {
      id: article.id,
      title: article.title,
      author: article.authorName,
      publishedAt: article.publishedAt ?? article.updatedAt,
      readingMinutes: readingMinutes(article.content),
      contentHtml: richTextToHtml(article.content),
      ...(article.coverImageUrl
        ? { cover: { url: article.coverImageUrl, alt: article.title } }
        : {}),
    },
    settings: { locale: article.locale === "en" ? "en" : "zh-CN", theme: "system" },
  };
}

export function articleApiUrl(slug: string, locale: string, rawBaseUrl = "") {
  const baseUrl = rawBaseUrl.replace(/\/$/, "");
  return `${baseUrl}/api/content/articles/${encodeURIComponent(slug)}?locale=${locale === "en" ? "en" : "zh"}`;
}

export function articleDeepLinkUrl(slug: string, locale: string) {
  return `linonward://article/${encodeURIComponent(slug)}?locale=${locale === "en" ? "en" : "zh"}`;
}

async function fetchArticle(slug: string, locale: string) {
  const response = await fetch(articleApiUrl(slug, locale, import.meta.env.VITE_API_URL));
  if (!response.ok) throw new Error(`Article request failed with ${response.status}`);
  const body = (await response.json()) as { article?: unknown };
  if (!isPublishedArticle(body.article)) throw new Error("Article response is invalid");
  return body.article;
}

function isPublishedArticle(value: unknown): value is PublishedArticle {
  if (!value || typeof value !== "object") return false;
  const article = value as Record<string, unknown>;
  return (
    typeof article.id === "string" &&
    typeof article.slug === "string" &&
    typeof article.title === "string" &&
    typeof article.authorName === "string" &&
    typeof article.locale === "string" &&
    typeof article.updatedAt === "string" &&
    Boolean(article.content) &&
    typeof article.content === "object"
  );
}

export function StandaloneArticle({
  bridge,
  locale,
  slug,
}: {
  bridge: Bridge;
  locale: string;
  slug: string;
}) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "ready"; payload: ArticlePayload } | { status: "error" }
  >({ status: "loading" });

  useEffect(() => {
    let active = true;
    void fetchArticle(slug, locale)
      .then((article) => {
        if (!active) return;
        if (!article) {
          setState({ status: "error" });
          return;
        }
        document.title = `${article.title} | LinOnward`;
        setState({ status: "ready", payload: toArticlePayload(article) });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [locale, slug]);

  if (state.status === "ready") {
    return (
      <>
        <nav
          aria-label={locale === "en" ? "Article actions" : "文章操作"}
          className="standalone-actions"
        >
          <a href={articleDeepLinkUrl(slug, locale)}>
            {locale === "en" ? "Open in LinOnward" : "在 LinOnward 中打开"}
          </a>
          <button
            onClick={() => {
              const share = { title: state.payload.article.title, url: window.location.href };
              if (navigator.share) void navigator.share(share);
              else void navigator.clipboard.writeText(share.url);
            }}
            type="button"
          >
            {locale === "en" ? "Share" : "分享"}
          </button>
        </nav>
        <App bridge={bridge} initialArticle={state.payload} />
      </>
    );
  }
  return (
    <main className="reader-state" aria-live="polite">
      {state.status === "loading" ? (
        <span className="reader-state__pulse" aria-hidden="true" />
      ) : null}
      <p>{state.status === "loading" ? "正在加载文章…" : "文章不存在或暂时无法加载。"}</p>
    </main>
  );
}
