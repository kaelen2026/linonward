import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { createBridge, hasNativeHost } from "./bridge";
import { StandaloneArticle } from "./standalone-article";
import "./styles.css";
import type { ArticlePayload } from "./types";

declare global {
  interface Window {
    __LINONWARD_ARTICLE__?: ArticlePayload;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");

const parentOrigin = import.meta.env.VITE_PARENT_ORIGIN || undefined;
const bridge = createBridge(window, parentOrigin);
const standaloneArticleId = /^\/articles\/([^/]+)\/?$/.exec(window.location.pathname)?.[1];
const usesStandaloneArticle = Boolean(standaloneArticleId) && !hasNativeHost(window);
const standaloneLocale =
  new URLSearchParams(window.location.search).get("locale") === "en" ? "en" : "zh";

createRoot(root).render(
  <StrictMode>
    {usesStandaloneArticle && standaloneArticleId ? (
      <StandaloneArticle
        bridge={bridge}
        locale={standaloneLocale}
        slug={decodeURIComponent(standaloneArticleId)}
      />
    ) : (
      <App bridge={bridge} initialArticle={window.__LINONWARD_ARTICLE__} />
    )}
  </StrictMode>,
);
