import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { createBridge } from "./bridge";
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

createRoot(root).render(
  <StrictMode>
    <App
      bridge={createBridge(window, parentOrigin)}
      initialArticle={window.__LINONWARD_ARTICLE__}
    />
  </StrictMode>,
);
