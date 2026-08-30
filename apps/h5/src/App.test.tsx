import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { createBridge } from "./bridge";
import { BRIDGE_PROTOCOL } from "./types";

const sessionId = "12345678-1234-1234-1234-123456789abc";

function nativeWindow() {
  return window as typeof window & { LinOnward?: { receive(message: unknown): void } };
}

afterEach(() => {
  Reflect.deleteProperty(window, "webkit");
});

describe("native article flow", () => {
  it("negotiates, renders native content, and returns interactions in the same session", async () => {
    const postMessage = vi.fn();
    Object.assign(window, { webkit: { messageHandlers: { linonward: { postMessage } } } });
    const bridge = createBridge();
    render(<App bridge={bridge} />);

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "bridge:hello", payload: expect.any(Object) }),
    );
    nativeWindow().LinOnward?.receive({
      type: "bridge:welcome",
      sessionId,
      payload: {
        protocol: BRIDGE_PROTOCOL,
        capabilities: [
          "article.set",
          "reader.settings",
          "article.link",
          "article.image",
          "article.selection",
        ],
      },
    });
    await waitFor(() =>
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: "reader:ready", sessionId }),
      ),
    );

    nativeWindow().LinOnward?.receive({
      type: "article:set",
      sessionId,
      payload: {
        article: {
          id: "native-article",
          title: "Native article",
          contentHtml:
            '<p>Safe body</p><a href="https://linonward.com">Open source</a><img src="https://linonward.com/cover.jpg" alt="Article cover">',
        },
        settings: { locale: "en", theme: "dark", fontScale: 1.2 },
      },
    });

    expect(await screen.findByRole("heading", { name: "Native article" })).toBeInTheDocument();
    expect(screen.getByText("Safe body")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Open source" }));
    await waitFor(() =>
      expect(postMessage).toHaveBeenLastCalledWith({
        type: "article:link",
        sessionId,
        payload: { href: "https://linonward.com/" },
      }),
    );

    fireEvent.keyDown(screen.getByRole("button", { name: "Article cover" }), { key: "Enter" });
    await waitFor(() =>
      expect(postMessage).toHaveBeenLastCalledWith({
        type: "article:image",
        sessionId,
        payload: { alt: "Article cover", src: "https://linonward.com/cover.jpg" },
      }),
    );

    const textNode = screen.getByText("Safe body").firstChild;
    if (!textNode) throw new Error("Article text is missing");
    const range = document.createRange();
    range.selectNodeContents(textNode);
    Object.assign(range, {
      getBoundingClientRect: () => ({
        bottom: 140,
        height: 20,
        left: 40,
        right: 120,
        top: 120,
        width: 80,
      }),
    });
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    fireEvent(document, new Event("selectionchange"));

    fireEvent.click(await screen.findByRole("button", { name: "Copy" }));
    await waitFor(() =>
      expect(postMessage).toHaveBeenLastCalledWith({
        type: "article:copy",
        sessionId,
        payload: { text: "Safe body" },
      }),
    );
    bridge.destroy();
  });
});
