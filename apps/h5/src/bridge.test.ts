import { afterEach, describe, expect, it, vi } from "vitest";
import { createBridge, helloMessage } from "./bridge";
import { BRIDGE_PROTOCOL } from "./types";

const sessionId = "12345678-1234-1234-1234-123456789abc";

function nativeWindow() {
  return window as typeof window & {
    LinOnward?: { receive(message: unknown): void };
  };
}

afterEach(() => {
  Reflect.deleteProperty(window, "webkit");
  Reflect.deleteProperty(window, "LinOnwardBridge");
});

describe("createBridge", () => {
  it("negotiates a session before authenticating iOS messages", () => {
    const postMessage = vi.fn();
    Object.assign(window, { webkit: { messageHandlers: { linonward: { postMessage } } } });
    const bridge = createBridge();
    const listener = vi.fn();
    bridge.onMessage(listener);

    expect(bridge.post(helloMessage)).toBe("ios");
    nativeWindow().LinOnward?.receive({
      type: "bridge:welcome",
      sessionId,
      payload: { protocol: BRIDGE_PROTOCOL, capabilities: ["article.set"] },
    });
    bridge.post({ type: "reader:ready", payload: { protocol: BRIDGE_PROTOCOL } });

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: "bridge:welcome" }));
    expect(postMessage).toHaveBeenLastCalledWith({
      type: "reader:ready",
      sessionId,
      payload: { protocol: BRIDGE_PROTOCOL },
    });
    bridge.destroy();
  });

  it("replays an asynchronous iOS welcome after React remounts its listener", () => {
    const bridge = createBridge();
    const firstListener = vi.fn();
    const unsubscribe = bridge.onMessage(firstListener);
    unsubscribe();

    nativeWindow().LinOnward?.receive({
      type: "bridge:welcome",
      sessionId,
      payload: { protocol: BRIDGE_PROTOCOL, capabilities: ["article.set"] },
    });

    const remountedListener = vi.fn();
    bridge.onMessage(remountedListener);

    expect(firstListener).not.toHaveBeenCalled();
    expect(remountedListener).toHaveBeenCalledOnce();
    expect(remountedListener).toHaveBeenCalledWith(
      expect.objectContaining({ type: "bridge:welcome", sessionId }),
    );
    bridge.destroy();
  });

  it("rejects messages carrying another page session", () => {
    const bridge = createBridge();
    const listener = vi.fn();
    bridge.onMessage(listener);
    nativeWindow().LinOnward?.receive({
      type: "bridge:welcome",
      sessionId,
      payload: { protocol: BRIDGE_PROTOCOL, capabilities: ["reader.settings"] },
    });
    listener.mockClear();

    nativeWindow().LinOnward?.receive({
      type: "reader:settings",
      sessionId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      payload: { theme: "dark" },
    });

    expect(listener).not.toHaveBeenCalled();
    bridge.destroy();
  });

  it("rejects malformed settings even when the session is valid", () => {
    const bridge = createBridge();
    const listener = vi.fn();
    bridge.onMessage(listener);
    nativeWindow().LinOnward?.receive({
      type: "bridge:welcome",
      sessionId,
      payload: { protocol: BRIDGE_PROTOCOL, capabilities: ["reader.settings"] },
    });
    listener.mockClear();

    nativeWindow().LinOnward?.receive({
      type: "reader:settings",
      sessionId,
      payload: { theme: "hostile", fontScale: "large" },
    });

    expect(listener).not.toHaveBeenCalled();
    bridge.destroy();
  });

  it("does not expose browser fallback messages without a configured parent origin", () => {
    const postMessage = vi.spyOn(window, "postMessage");
    const bridge = createBridge();

    expect(bridge.post(helloMessage)).toBe("web");
    expect(postMessage).not.toHaveBeenCalled();
    bridge.destroy();
    postMessage.mockRestore();
  });
});
