import { describe, expect, it } from "vitest";
import {
  HYBRID_CAPABILITIES,
  HYBRID_MAX_MESSAGE_BYTES,
  HYBRID_PROTOCOL,
  isHybridOfflineManifest,
  isHybridReleaseChannel,
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
      "article.selection",
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

describe("offline manifest", () => {
  it("accepts the versioned asset integrity contract", () => {
    expect(
      isHybridOfflineManifest({
        artifactVersion: "a".repeat(64),
        entrypoint: "index.html",
        files: [{ path: "index.html", sha256: "b".repeat(64), size: 42 }],
        protocol: HYBRID_PROTOCOL,
        schemaVersion: 1,
      }),
    ).toBe(true);
  });

  it("rejects traversal paths and incompatible protocol majors", () => {
    const manifest = {
      artifactVersion: "a".repeat(64),
      entrypoint: "index.html",
      files: [{ path: "../index.html", sha256: "b".repeat(64), size: 42 }],
      protocol: { major: 2, minor: 0 },
      schemaVersion: 1,
    };
    expect(isHybridOfflineManifest(manifest)).toBe(false);
  });
});

describe("release channel", () => {
  it("accepts an HTTPS pointer to an immutable artifact", () => {
    const artifactVersion = "a".repeat(64);
    expect(
      isHybridReleaseChannel({
        artifactVersion,
        manifestUrl: `https://cdn.example.com/hybrid/releases/${artifactVersion}/hybrid-manifest.json`,
        minimumAppVersion: "1.2.0",
        releaseName: "2026.08.30.1",
        rolloutPercentage: 10,
        schemaVersion: 1,
      }),
    ).toBe(true);
  });

  it("rejects insecure, mismatched, or invalid rollout pointers", () => {
    const artifactVersion = "a".repeat(64);
    const channel = {
      artifactVersion,
      manifestUrl: `http://cdn.example.com/releases/${artifactVersion}/hybrid-manifest.json`,
      releaseName: "release 1",
      rolloutPercentage: 101,
      schemaVersion: 1,
    };
    expect(isHybridReleaseChannel(channel)).toBe(false);
    expect(
      isHybridReleaseChannel({
        ...channel,
        manifestUrl: `https://cdn.example.com/releases/${"b".repeat(64)}/hybrid-manifest.json`,
        releaseName: "release-1",
        rolloutPercentage: 100,
      }),
    ).toBe(false);
  });
});
