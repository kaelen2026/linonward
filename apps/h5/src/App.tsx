import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  formatPublishedAt,
  isArticlePayload,
  normalizeSettings,
  sanitizeArticleHtml,
} from "./article";
import type { Bridge } from "./bridge";
import { helloMessage } from "./bridge";
import { demoArticle } from "./demo";
import { type ArticlePayload, BRIDGE_PROTOCOL, type ReaderSettings } from "./types";

interface AppProps {
  bridge: Bridge;
  initialArticle?: ArticlePayload;
}

function getInitialArticle(initialArticle?: ArticlePayload) {
  if (initialArticle) return initialArticle;
  return new URLSearchParams(window.location.search).get("demo") === "1" ? demoArticle : undefined;
}

export function App({ bridge, initialArticle }: AppProps) {
  const [payload, setPayload] = useState<ArticlePayload | undefined>(() =>
    getInitialArticle(initialArticle),
  );
  const [settingsOverride, setSettingsOverride] = useState<ReaderSettings>();
  const handshakeStarted = useRef(false);
  const rootRef = useRef<HTMLElement>(null);
  const settings = normalizeSettings({ ...payload?.settings, ...settingsOverride });
  const sanitizedHtml = useMemo(
    () => (payload ? sanitizeArticleHtml(payload.article.contentHtml) : ""),
    [payload],
  );

  useLayoutEffect(() => {
    const unsubscribe = bridge.onMessage((message) => {
      if (message.type === "bridge:welcome") {
        bridge.post({
          type: "reader:ready",
          payload: { protocol: BRIDGE_PROTOCOL },
        });
        return;
      }
      if (message.type === "reader:settings") {
        setSettingsOverride(message.payload);
        return;
      }
      if (isArticlePayload(message.payload)) {
        setPayload(message.payload);
      } else {
        bridge.post({
          type: "reader:error",
          payload: { code: "INVALID_ARTICLE", message: "Article payload is invalid" },
        });
      }
    });
    if (!handshakeStarted.current) {
      handshakeStarted.current = true;
      bridge.post(helloMessage);
    }
    return unsubscribe;
  }, [bridge]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let previousHeight = 0;
    const observer = new ResizeObserver(([entry]) => {
      const height = Math.ceil(entry?.contentRect.height ?? 0);
      if (height > 0 && height !== previousHeight) {
        previousHeight = height;
        bridge.post({ type: "reader:height", payload: { height } });
      }
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [bridge]);

  useEffect(() => {
    if (!payload) return;
    const root = rootRef.current;
    if (!root) return;

    for (const image of root.querySelectorAll(".article-body img")) {
      image.setAttribute("role", "button");
      image.setAttribute("tabindex", "0");
    }

    const dispatchInteraction = (event: MouseEvent | KeyboardEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest(".article-body a");
      if (anchor instanceof HTMLAnchorElement) {
        event.preventDefault();
        bridge.post({ type: "article:link", payload: { href: anchor.href } });
        return;
      }

      const image = target.closest(".article-body img");
      if (image instanceof HTMLImageElement) {
        if (event instanceof KeyboardEvent && event.key !== "Enter" && event.key !== " ") return;
        if (event instanceof KeyboardEvent) event.preventDefault();
        bridge.post({
          type: "article:image",
          payload: { alt: image.alt, src: image.currentSrc || image.src },
        });
      }
    };

    root.addEventListener("click", dispatchInteraction);
    root.addEventListener("keydown", dispatchInteraction);
    return () => {
      root.removeEventListener("click", dispatchInteraction);
      root.removeEventListener("keydown", dispatchInteraction);
    };
  }, [bridge, payload]);

  if (!payload) {
    return (
      <main className="reader-state" aria-live="polite">
        <span className="reader-state__pulse" aria-hidden="true" />
        <p>正在加载文章…</p>
      </main>
    );
  }

  const { article } = payload;
  const publishedAt = formatPublishedAt(article.publishedAt, settings.locale);
  const theme = settings.theme === "system" ? undefined : settings.theme;

  return (
    <main
      className="reader"
      data-theme={theme}
      lang={settings.locale}
      ref={rootRef}
      style={{ "--reader-font-scale": settings.fontScale } as React.CSSProperties}
    >
      <article>
        <header className="article-header">
          <h1>{article.title}</h1>
          {(article.author || publishedAt || article.readingMinutes) && (
            <div className="article-meta">
              {article.author && <span>{article.author}</span>}
              {publishedAt && <time dateTime={article.publishedAt}>{publishedAt}</time>}
              {article.readingMinutes && <span>{article.readingMinutes} 分钟阅读</span>}
            </div>
          )}
        </header>

        {article.cover && (
          <button
            aria-label={article.cover.alt}
            className="article-cover-button"
            onClick={() =>
              bridge.post({
                type: "article:image",
                payload: { alt: article.cover?.alt ?? "", src: article.cover?.url ?? "" },
              })
            }
            type="button"
          >
            <figure className="article-cover">
              <img alt="" src={article.cover.url} />
              {article.cover.caption && <figcaption>{article.cover.caption}</figcaption>}
            </figure>
          </button>
        )}

        <section
          className="article-body"
          // The HTML is sanitized immediately before rendering.
          // biome-ignore lint/security/noDangerouslySetInnerHtml: DOMPurify sanitizes the allowlisted article HTML.
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </article>
    </main>
  );
}
