import CryptoKit
import Foundation
import Testing

@testable import LinOnward

@Suite("Hybrid bundle updater")
struct HybridBundleUpdaterTests {
  @Test("downloads, verifies, and activates an immutable release")
  func activatesVerifiedRelease() async throws {
    let fixture = try Fixture()
    let updater = HybridBundleUpdater(root: fixture.root) { url in
      try #require(fixture.responses[url])
    }

    try await updater.refresh(
      channelURL: fixture.channelURL,
      appVersion: "1.2.0",
      rolloutSeed: "installation-1"
    )

    let configuration = try #require(HybridBundleStore.activeConfiguration(root: fixture.root))
    #expect(configuration.usesBundledResources)
    #expect(
      try String(
        contentsOf: try #require(configuration.resourceRoot).appending(path: "index.html"),
        encoding: .utf8
      ) == fixture.index
    )
  }

  @Test("keeps the previous active version when an asset fails integrity")
  func preservesPreviousVersion() async throws {
    let fixture = try Fixture(corruptAsset: true)
    try FileManager.default.createDirectory(at: fixture.root, withIntermediateDirectories: true)
    try Data("\(String(repeating: "b", count: 64))\n".utf8).write(
      to: fixture.root.appending(path: "active-version")
    )
    let updater = HybridBundleUpdater(root: fixture.root) { url in
      try #require(fixture.responses[url])
    }

    await #expect(throws: HybridBundleUpdateError.invalidManifest) {
      try await updater.refresh(
        channelURL: fixture.channelURL,
        appVersion: "1.2.0",
        rolloutSeed: "installation-1"
      )
    }
    #expect(
      try String(
        contentsOf: fixture.root.appending(path: "active-version"),
        encoding: .utf8
      ).trimmingCharacters(in: .whitespacesAndNewlines) == String(repeating: "b", count: 64)
    )
  }

  @Test("rejects a manifest requiring another bridge major")
  func rejectsIncompatibleProtocol() async throws {
    let fixture = try Fixture(protocolMajor: 2)
    let updater = HybridBundleUpdater(root: fixture.root) { url in
      try #require(fixture.responses[url])
    }

    await #expect(throws: HybridBundleUpdateError.incompatibleProtocol) {
      try await updater.refresh(
        channelURL: fixture.channelURL,
        appVersion: "1.2.0",
        rolloutSeed: "installation-1"
      )
    }
  }

  @Test("repairs a corrupted cached release before activation")
  func repairsCorruptedCachedRelease() async throws {
    let fixture = try Fixture()
    let release = fixture.root.appending(
      path: "releases/\(fixture.artifactVersion)",
      directoryHint: .isDirectory
    )
    try FileManager.default.createDirectory(at: release, withIntermediateDirectories: true)
    try Data("corrupt".utf8).write(to: release.appending(path: "index.html"))
    let updater = HybridBundleUpdater(root: fixture.root) { url in
      try #require(fixture.responses[url])
    }

    try await updater.refresh(
      channelURL: fixture.channelURL,
      appVersion: "1.2.0",
      rolloutSeed: "installation-1"
    )

    #expect(
      try String(contentsOf: release.appending(path: "index.html"), encoding: .utf8)
        == fixture.index
    )
  }
}

private struct Fixture: Sendable {
  let channelURL = URL(string: "https://cdn.example.com/hybrid/channels/production.json")!
  let index = "<main>LinOnward</main>"
  let artifactVersion: String
  let responses: [URL: Data]
  let root: URL

  init(corruptAsset: Bool = false, protocolMajor: Int = 1) throws {
    root = FileManager.default.temporaryDirectory
      .appending(path: UUID().uuidString, directoryHint: .isDirectory)
    let indexData = Data(index.utf8)
    let assetHash = Self.sha256(indexData)
    let record = "index.html\0\(assetHash)\0\(indexData.count)"
    artifactVersion = Self.sha256(Data(record.utf8))
    let manifestURL = URL(
      string: "https://cdn.example.com/hybrid/releases/\(artifactVersion)/hybrid-manifest.json"
    )!
    let assetURL = manifestURL.deletingLastPathComponent().appending(path: "index.html")
    let manifest = HybridOfflineManifest(
      artifactVersion: artifactVersion,
      entrypoint: "index.html",
      files: [.init(path: "index.html", sha256: assetHash, size: indexData.count)],
      protocol: .init(major: protocolMajor, minor: 0),
      schemaVersion: 1
    )
    let channel = HybridReleaseChannel(
      artifactVersion: artifactVersion,
      manifestUrl: manifestURL.absoluteString,
      minimumAppVersion: "1.0.0",
      releaseName: "2026.08.30.1",
      rolloutPercentage: 100,
      schemaVersion: 1
    )
    responses = [
      channelURL: try JSONEncoder().encode(channel),
      manifestURL: try JSONEncoder().encode(manifest),
      assetURL: corruptAsset ? Data("corrupt".utf8) : indexData,
    ]
  }

  private static func sha256(_ data: Data) -> String {
    SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
  }
}
