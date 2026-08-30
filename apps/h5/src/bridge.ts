import {
  HYBRID_MAX_MESSAGE_BYTES,
  HYBRID_SESSION_ID_MAX_LENGTH,
  HYBRID_SESSION_ID_MIN_LENGTH,
} from "@linonward/hybrid-contracts";
import { isArticlePayload } from "./article";
import {
  BRIDGE_CAPABILITIES,
  BRIDGE_PROTOCOL,
  type BridgeCapability,
  type NativeMessage,
  type ReaderSettings,
  type WebMessage,
} from "./types";

const BRIDGE_NAME = "linonward";
const WEB_MESSAGE_SOURCE = "linonward-native";
const themes = new Set(["light", "dark", "system"]);

type MessageListener = (message: NativeMessage) => void;

interface AndroidBridge {
  postMessage(message: string): void;
}

interface IosMessageHandler {
  postMessage(message: WebMessage): void;
}

interface NativeWindow extends Window {
  LinOnward?: {
    receive(message: NativeMessage | string): void;
  };
  LinOnwardBridge?: AndroidBridge;
  ReactNativeWebView?: AndroidBridge;
  webkit?: {
    messageHandlers?: Record<string, IosMessageHandler | undefined>;
  };
}

export function hasNativeHost(target: Window = window) {
  const nativeTarget = target as NativeWindow;
  return Boolean(
    nativeTarget.webkit?.messageHandlers?.[BRIDGE_NAME] ||
      nativeTarget.LinOnwardBridge ||
      nativeTarget.ReactNativeWebView,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSessionId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= HYBRID_SESSION_ID_MIN_LENGTH &&
    value.length <= HYBRID_SESSION_ID_MAX_LENGTH
  );
}

function isSettings(value: unknown): value is ReaderSettings {
  if (!isRecord(value)) return false;
  if (value.theme !== undefined && (typeof value.theme !== "string" || !themes.has(value.theme))) {
    return false;
  }
  if (
    value.fontScale !== undefined &&
    (typeof value.fontScale !== "number" || !Number.isFinite(value.fontScale))
  ) {
    return false;
  }
  if (value.locale === undefined) return true;
  if (typeof value.locale !== "string" || value.locale.length > 35) return false;
  try {
    Intl.getCanonicalLocales(value.locale);
    return true;
  } catch {
    return false;
  }
}

function isWelcomePayload(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.protocol) || !Array.isArray(value.capabilities)) {
    return false;
  }
  return (
    value.protocol.major === BRIDGE_PROTOCOL.major &&
    typeof value.protocol.minor === "number" &&
    Number.isInteger(value.protocol.minor) &&
    value.protocol.minor >= 0 &&
    value.capabilities.every(
      (capability) =>
        typeof capability === "string" &&
        BRIDGE_CAPABILITIES.includes(capability as BridgeCapability),
    )
  );
}

function parseNativeMessage(value: unknown, sessionId?: string): NativeMessage | undefined {
  let candidate = value;
  if (typeof candidate === "string") {
    if (new TextEncoder().encode(candidate).byteLength > HYBRID_MAX_MESSAGE_BYTES) return undefined;
    try {
      candidate = JSON.parse(candidate) as unknown;
    } catch {
      return undefined;
    }
  } else {
    try {
      const encoded = JSON.stringify(candidate);
      if (new TextEncoder().encode(encoded).byteLength > HYBRID_MAX_MESSAGE_BYTES) return undefined;
    } catch {
      return undefined;
    }
  }

  if (!isRecord(candidate) || typeof candidate.type !== "string") return undefined;
  if (!isSessionId(candidate.sessionId)) return undefined;

  if (candidate.type === "bridge:welcome") {
    return isWelcomePayload(candidate.payload)
      ? (candidate as unknown as NativeMessage)
      : undefined;
  }
  if (candidate.sessionId !== sessionId) return undefined;
  if (candidate.type === "article:set") {
    const payload = candidate.payload;
    const settingsAreValid =
      isRecord(payload) && (payload.settings === undefined || isSettings(payload.settings));
    return isArticlePayload(payload) && settingsAreValid
      ? (candidate as unknown as NativeMessage)
      : undefined;
  }
  if (candidate.type === "reader:settings") {
    return isSettings(candidate.payload) ? (candidate as unknown as NativeMessage) : undefined;
  }
  return undefined;
}

export function createBridge(target: NativeWindow = window, allowedParentOrigin?: string) {
  const listeners = new Set<MessageListener>();
  let sessionId: string | undefined;
  let welcomeMessage: NativeMessage | undefined;
  const parentOrigin = normalizeParentOrigin(allowedParentOrigin);

  const receive = (value: unknown) => {
    const message = parseNativeMessage(value, sessionId);
    if (!message) return;
    if (message.type === "bridge:welcome") {
      sessionId = message.sessionId;
      welcomeMessage = message;
    }
    for (const listener of listeners) listener(message);
  };

  target.LinOnward = { receive };

  const onWindowMessage = (event: MessageEvent) => {
    if (
      parentOrigin &&
      event.source === target.parent &&
      event.origin === parentOrigin &&
      event.data?.source === WEB_MESSAGE_SOURCE
    ) {
      receive(event.data.message);
    }
  };
  target.addEventListener("message", onWindowMessage);

  return {
    destroy() {
      target.removeEventListener("message", onWindowMessage);
      delete target.LinOnward;
      listeners.clear();
      sessionId = undefined;
      welcomeMessage = undefined;
    },
    onMessage(listener: MessageListener) {
      listeners.add(listener);
      if (welcomeMessage) listener(welcomeMessage);
      return () => {
        listeners.delete(listener);
      };
    },
    post(message: WebMessage) {
      const authenticatedMessage =
        message.type === "bridge:hello" ? message : { ...message, sessionId };
      const ios = target.webkit?.messageHandlers?.[BRIDGE_NAME];
      if (ios) {
        ios.postMessage(authenticatedMessage);
        return "ios" as const;
      }

      const serialized = JSON.stringify(authenticatedMessage);
      if (target.LinOnwardBridge) {
        target.LinOnwardBridge.postMessage(serialized);
        return "android" as const;
      }
      if (target.ReactNativeWebView) {
        target.ReactNativeWebView.postMessage(serialized);
        return "react-native" as const;
      }

      if (parentOrigin) {
        target.parent?.postMessage(
          { source: "linonward-h5", message: authenticatedMessage },
          parentOrigin,
        );
      }
      return "web" as const;
    },
    session() {
      return sessionId;
    },
  };
}

function normalizeParentOrigin(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if ((url.protocol === "https:" || url.protocol === "http:") && url.origin === value) {
      return url.origin;
    }
  } catch {
    // Invalid build configuration disables the optional browser transport.
  }
  return undefined;
}

export const helloMessage: WebMessage = {
  type: "bridge:hello",
  payload: { capabilities: BRIDGE_CAPABILITIES, protocol: BRIDGE_PROTOCOL },
};

export type Bridge = ReturnType<typeof createBridge>;
