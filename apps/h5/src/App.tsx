import { useEffect, useMemo, useRef, useState } from "react";
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

interface SelectionMenuState {
  left: number;
  text: string;
  top: number;
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
  const [selectionActionsEnabled, setSelectionActionsEnabled] = useState(false);
  const handshakeStarted = useRef(false);
  const rootRef = useRef<HTMLElement>(null);
  const selectedRange = useRef<Range | undefined>(undefined);
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenuState>();
  const settings = normalizeSettings({ ...payload?.settings, ...settingsOverride });
  const sanitizedHtml = useMemo(
    () => (payload ? sanitizeArticleHtml(payload.article.contentHtml) : ""),
    [payload],
  );

  const dispatchInteraction = (
    event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
  ) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const anchor = target.closest(".article-body a");
    if (anchor instanceof HTMLAnchorElement) {
      event.preventDefault();
      bridge.post({ type: "article:link", payload: { href: anchor.href } });
      return;
    }

    const image = target.closest(".article-body img");
    if (!(image instanceof HTMLImageElement)) return;
    if ("key" in event && event.key !== "Enter" && event.key !== " ") return;
    if ("key" in event) event.preventDefault();
    bridge.post({
      type: "article:image",
      payload: { alt: image.alt, src: image.currentSrc || image.src },
    });
  };

  useEffect(() => {
    const unsubscribe = bridge.onMessage((message) => {
      if (message.type === "bridge:welcome") {
        setSelectionActionsEnabled(message.payload.capabilities.includes("article.selection"));
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
  }, [payload]);

  useEffect(() => {
    const updateSelection = () => {
      if (!selectionActionsEnabled) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        return;
      }
      const range = selection.getRangeAt(0);
      const body = rootRef.current?.querySelector(".article-body");
      if (!body?.contains(range.commonAncestorContainer)) return;
      const text = selection.toString().trim();
      if (!text) return;

      const rect = range.getBoundingClientRect();
      selectedRange.current = range.cloneRange();
      setSelectionMenu({
        left: Math.min(window.innerWidth - 16, Math.max(16, rect.left + rect.width / 2)),
        text,
        top: Math.max(12, rect.top - 12),
      });
    };
    const dismiss = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".selection-menu")) return;
      if (window.getSelection()?.isCollapsed) setSelectionMenu(undefined);
    };
    document.addEventListener("selectionchange", updateSelection);
    document.addEventListener("pointerdown", dismiss);
    return () => {
      document.removeEventListener("selectionchange", updateSelection);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, [selectionActionsEnabled]);

  const finishSelectionAction = () => {
    window.getSelection()?.removeAllRanges();
    selectedRange.current = undefined;
    setSelectionMenu(undefined);
  };

  const copySelection = () => {
    if (!selectionMenu) return;
    bridge.post({ type: "article:copy", payload: { text: selectionMenu.text } });
    finishSelectionAction();
  };

  const shareSelection = () => {
    if (!selectionMenu) return;
    bridge.post({ type: "article:share", payload: { text: selectionMenu.text } });
    finishSelectionAction();
  };

  const highlightSelection = () => {
    const range = selectedRange.current;
    if (!range || range.collapsed) return;
    const mark = document.createElement("mark");
    mark.className = "article-highlight";
    mark.append(range.extractContents());
    range.insertNode(mark);
    finishSelectionAction();
  };

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

        {/* Delegation preserves the native semantics of the sanitized links and focusable images. */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: child links and images own the interaction semantics. */}
        <section
          className="article-body"
          onClick={dispatchInteraction}
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={dispatchInteraction}
          // The HTML is sanitized immediately before rendering.
          // biome-ignore lint/security/noDangerouslySetInnerHtml: DOMPurify sanitizes the allowlisted article HTML.
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </article>
      {selectionMenu && (
        <div
          aria-label={settings.locale.startsWith("en") ? "Selection actions" : "选中文字操作"}
          className="selection-menu"
          role="toolbar"
          style={{ left: selectionMenu.left, top: selectionMenu.top }}
        >
          <button onClick={copySelection} type="button">
            <span aria-hidden="true">▣</span>
            {settings.locale.startsWith("en") ? "Copy" : "复制"}
          </button>
          <button onClick={shareSelection} type="button">
            <span aria-hidden="true">↗</span>
            {settings.locale.startsWith("en") ? "Share" : "分享"}
          </button>
          <button onClick={highlightSelection} type="button">
            <span aria-hidden="true">╱</span>
            {settings.locale.startsWith("en") ? "Highlight" : "划线"}
          </button>
        </div>
      )}
    </main>
  );
}
