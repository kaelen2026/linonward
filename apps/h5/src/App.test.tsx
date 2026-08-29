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
        capabilities: ["article.set", "reader.settings", "article.link"],
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
          contentHtml: '<p>Safe body</p><a href="https://linonward.com">Open source</a>',
        },
        settings: { locale: "en", theme: "dark", fontScale: 1.2 },
      },
    });

    expect(await screen.findByRole("heading", { name: "Native article" })).toBeInTheDocument();
    expect(screen.getByText("Safe body")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Open source" }));
    expect(postMessage).toHaveBeenLastCalledWith({
      type: "article:link",
      sessionId,
      payload: { href: "https://linonward.com/" },
    });
    bridge.destroy();
  });
});
