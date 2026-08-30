import { describe, expect, it } from "vitest";
import {
  HYBRID_CAPABILITIES,
  HYBRID_MAX_MESSAGE_BYTES,
  HYBRID_PROTOCOL,
  negotiateHybridProtocol,
} from "./index";

describe("hybrid protocol", () => {
  it("freezes the cross-platform protocol constants", () => {
    expect(HYBRID_PROTOCOL).toEqual({ major: 1, minor: 0 });
    expect(HYBRID_MAX_MESSAGE_BYTES).toBe(1_000_000);
    expect(HYBRID_CAPABILITIES).toEqual([
      "article.set",
      "reader.settings",
      "reader.height",
      "article.link",
      "article.image",
    ]);
  });

  it("negotiates the shared minor and capability intersection", () => {
    expect(
      negotiateHybridProtocol({ major: 1, minor: 4 }, ["article.set", "future.capability"]),
    ).toEqual({
      capabilities: ["article.set"],
      protocol: { major: 1, minor: 0 },
    });
  });

  it("rejects incompatible and malformed protocol versions", () => {
    expect(negotiateHybridProtocol({ major: 2, minor: 0 }, [])).toBeUndefined();
    expect(negotiateHybridProtocol({ major: 1, minor: -1 }, [])).toBeUndefined();
    expect(negotiateHybridProtocol({ major: 1, minor: 0.5 }, [])).toBeUndefined();
  });
});
