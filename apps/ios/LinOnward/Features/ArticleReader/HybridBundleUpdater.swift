import CryptoKit
import Foundation

private let hybridProtocolMajor = 1
private let maximumHybridFiles = 512
private let maximumHybridBytes = 50_000_000
private let maximumHybridMetadataBytes = 256_000

struct HybridReleaseChannel: Codable, Sendable {
  let artifactVersion: String
  let manifestUrl: String
  let minimumAppVersion: String?
  let releaseName: String
  let rolloutPercentage: Int
  let schemaVersion: Int
}

struct HybridOfflineManifest: Codable, Sendable {
  struct Asset: Codable, Sendable {
    let path: String
    let sha256: String
    let size: Int
  }

  struct ProtocolVersion: Codable, Sendable {
    let major: Int
    let minor: Int
  }

  let artifactVersion: String
  let entrypoint: String
  let files: [Asset]
  let `protocol`: ProtocolVersion
  let schemaVersion: Int
}

enum HybridBundleUpdateError: Error, Equatable {
  case incompatibleAppVersion
  case incompatibleProtocol
  case invalidChannel
  case invalidManifest
  case invalidResponse
  case notInRollout
}

enum HybridUpdateConfiguration {
  private static let channelKey = "LinOnwardHybridChannelURL"
  private static let rolloutSeedKey = "hybrid.rollout.seed"

  static func channelURL(bundle: Bundle = .main) -> URL? {
    guard let raw = bundle.object(forInfoDictionaryKey: channelKey) as? String,
      let components = URLComponents(string: raw.trimmingCharacters(in: .whitespacesAndNewlines)),
      components.scheme?.lowercased() == "https",
      components.host != nil,
      components.user == nil,
      components.password == nil,
      components.query == nil,
      components.fragment == nil
    else { return nil }
    return components.url
  }

  static func appVersion(bundle: Bundle = .main) -> String {
    bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.0.0"
  }

  @MainActor
  static func rolloutSeed(defaults: UserDefaults = .standard) -> String {
    if let existing = defaults.string(forKey: rolloutSeedKey) { return existing }
    let seed = UUID().uuidString.lowercased()
    defaults.set(seed, forKey: rolloutSeedKey)
    return seed
  }
}

enum HybridBundleStore {
  static func root(fileManager: FileManager = .default) -> URL? {
    fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first?
      .appending(path: "HybridArticleReader", directoryHint: .isDirectory)
  }

  static func activeConfiguration(
    root: URL? = root(),
    fileManager: FileManager = .default
  ) -> ArticleReaderConfiguration? {
    guard let root,
      let version = try? String(
        contentsOf: root.appending(path: "active-version"),
        encoding: .utf8
      ).trimmingCharacters(in: .whitespacesAndNewlines),
      version.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil
    else { return nil }
    let release = root.appending(path: "releases/\(version)", directoryHint: .isDirectory)
    guard fileManager.fileExists(atPath: release.path) else { return nil }
    return ArticleReaderConfiguration.cached(resourceRoot: release)
  }

  static func deactivate(
    configuration: ArticleReaderConfiguration,
    root: URL? = root(),
    fileManager: FileManager = .default
  ) {
    guard let root, let resourceRoot = configuration.resourceRoot,
      resourceRoot.deletingLastPathComponent().standardizedFileURL
        == root.appending(path: "releases", directoryHint: .isDirectory).standardizedFileURL
    else { return }
    try? fileManager.removeItem(at: root.appending(path: "active-version"))
  }
}

actor HybridBundleUpdater {
  typealias Fetch = @Sendable (URL) async throws -> Data

  private let decoder = JSONDecoder()
  private let fetch: Fetch
  private let fileManager: FileManager
  private let root: URL

  init(
    root: URL? = HybridBundleStore.root(),
    fileManager: FileManager = .default,
    fetch: @escaping Fetch = HybridBundleUpdater.fetchData
  ) {
    self.root = root ?? fileManager.temporaryDirectory
      .appending(path: "HybridArticleReader", directoryHint: .isDirectory)
    self.fileManager = fileManager
    self.fetch = fetch
  }

  func refresh(channelURL: URL, appVersion: String, rolloutSeed: String) async throws {
    let channelData = try await fetch(channelURL)
    guard channelData.count <= maximumHybridMetadataBytes else {
      throw HybridBundleUpdateError.invalidChannel
    }
    let channel = try decoder.decode(HybridReleaseChannel.self, from: channelData)
    let manifestURL = try validate(
      channel: channel,
      channelURL: channelURL,
      appVersion: appVersion,
      rolloutSeed: rolloutSeed
    )
    let manifestData = try await fetch(manifestURL)
    guard manifestData.count <= maximumHybridMetadataBytes else {
      throw HybridBundleUpdateError.invalidManifest
    }
    let manifest = try decoder.decode(HybridOfflineManifest.self, from: manifestData)
    try validate(manifest: manifest, expectedVersion: channel.artifactVersion)

    let releases = root.appending(path: "releases", directoryHint: .isDirectory)
    let release = releases.appending(path: manifest.artifactVersion, directoryHint: .isDirectory)
    if fileManager.fileExists(atPath: release.path), !verify(manifest: manifest, release: release) {
      try fileManager.removeItem(at: release)
    }
    if !fileManager.fileExists(atPath: release.path) {
      let staging = root.appending(
        path: "staging-\(manifest.artifactVersion)",
        directoryHint: .isDirectory
      )
      try? fileManager.removeItem(at: staging)
      try fileManager.createDirectory(at: staging, withIntermediateDirectories: true)
      do {
        for asset in manifest.files {
          let data = try await fetch(assetURL(for: asset.path, manifestURL: manifestURL))
          guard data.count == asset.size, sha256(data) == asset.sha256 else {
            throw HybridBundleUpdateError.invalidManifest
          }
          let destination = staging.appending(path: asset.path)
          try fileManager.createDirectory(
            at: destination.deletingLastPathComponent(),
            withIntermediateDirectories: true
          )
          try data.write(to: destination, options: .atomic)
        }
        try manifestData.write(
          to: staging.appending(path: "hybrid-manifest.json"),
          options: .atomic
        )
        try fileManager.createDirectory(at: releases, withIntermediateDirectories: true)
        try fileManager.moveItem(at: staging, to: release)
      } catch {
        try? fileManager.removeItem(at: staging)
        throw error
      }
    }
    try activate(version: manifest.artifactVersion)
  }

  private func validate(
    channel: HybridReleaseChannel,
    channelURL: URL,
    appVersion: String,
    rolloutSeed: String
  ) throws -> URL {
    guard channel.schemaVersion == 1,
      isHash(channel.artifactVersion),
      channel.releaseName.range(
        of: "^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$",
        options: .regularExpression
      ) != nil,
      (0...100).contains(channel.rolloutPercentage),
      let manifestURL = secureURL(channel.manifestUrl),
      manifestURL.path.hasSuffix(
        "/releases/\(channel.artifactVersion)/hybrid-manifest.json"
      ),
      sameOrigin(channelURL, manifestURL)
    else { throw HybridBundleUpdateError.invalidChannel }
    if let minimum = channel.minimumAppVersion,
      appVersion.compare(minimum, options: .numeric) == .orderedAscending
    {
      throw HybridBundleUpdateError.incompatibleAppVersion
    }
    guard rolloutBucket(seed: rolloutSeed, version: channel.artifactVersion)
      < channel.rolloutPercentage
    else { throw HybridBundleUpdateError.notInRollout }
    return manifestURL
  }

  private func validate(manifest: HybridOfflineManifest, expectedVersion: String) throws {
    guard manifest.schemaVersion == 1,
      manifest.entrypoint == "index.html",
      manifest.protocol.major == hybridProtocolMajor,
      manifest.protocol.minor >= 0,
      manifest.artifactVersion == expectedVersion,
      manifest.files.count <= maximumHybridFiles,
      Set(manifest.files.map(\.path)).count == manifest.files.count,
      manifest.files.contains(where: { $0.path == "index.html" }),
      manifest.files.reduce(0, { $0 + $1.size }) <= maximumHybridBytes,
      manifest.files.allSatisfy({ valid(asset: $0) }),
      artifactVersion(for: manifest.files) == manifest.artifactVersion
    else {
      throw manifest.protocol.major == hybridProtocolMajor
        ? HybridBundleUpdateError.invalidManifest
        : HybridBundleUpdateError.incompatibleProtocol
    }
  }

  private func valid(asset: HybridOfflineManifest.Asset) -> Bool {
    !asset.path.isEmpty && !asset.path.hasPrefix("/") && !asset.path.contains("..")
      && asset.path.range(of: "^[A-Za-z0-9._/-]+$", options: .regularExpression) != nil
      && isHash(asset.sha256) && (0...maximumHybridBytes).contains(asset.size)
  }

  private func verify(manifest: HybridOfflineManifest, release: URL) -> Bool {
    manifest.files.allSatisfy { asset in
      guard let data = try? Data(contentsOf: release.appending(path: asset.path)) else {
        return false
      }
      return data.count == asset.size && sha256(data) == asset.sha256
    }
  }

  private func assetURL(for path: String, manifestURL: URL) throws -> URL {
    var url = manifestURL.deletingLastPathComponent()
    for component in path.split(separator: "/") { url.append(path: String(component)) }
    guard sameOrigin(manifestURL, url) else { throw HybridBundleUpdateError.invalidManifest }
    return url
  }

  private func activate(version: String) throws {
    try fileManager.createDirectory(at: root, withIntermediateDirectories: true)
    let active = root.appending(path: "active-version")
    let temporary = root.appending(path: "active-version.tmp")
    try Data("\(version)\n".utf8).write(to: temporary, options: .atomic)
    if fileManager.fileExists(atPath: active.path) {
      _ = try fileManager.replaceItemAt(active, withItemAt: temporary)
    } else {
      try fileManager.moveItem(at: temporary, to: active)
    }
  }

  private func artifactVersion(for files: [HybridOfflineManifest.Asset]) -> String {
    sha256(Data(files.map { "\($0.path)\0\($0.sha256)\0\($0.size)" }.joined(separator: "\n").utf8))
  }

  private func rolloutBucket(seed: String, version: String) -> Int {
    let digest = SHA256.hash(data: Data("\(seed):\(version)".utf8))
    return Int(digest.prefix(4).reduce(UInt32(0)) { ($0 << 8) | UInt32($1) } % 100)
  }

  private func secureURL(_ raw: String) -> URL? {
    guard let components = URLComponents(string: raw),
      components.scheme?.lowercased() == "https",
      components.host != nil,
      components.user == nil,
      components.password == nil,
      components.query == nil,
      components.fragment == nil
    else { return nil }
    return components.url
  }

  private func sameOrigin(_ lhs: URL, _ rhs: URL) -> Bool {
    lhs.scheme?.lowercased() == rhs.scheme?.lowercased()
      && lhs.host?.lowercased() == rhs.host?.lowercased()
      && (lhs.port ?? 443) == (rhs.port ?? 443)
  }

  private func isHash(_ value: String) -> Bool {
    value.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil
  }

  private func sha256(_ data: Data) -> String {
    SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
  }

  private static func fetchData(_ url: URL) async throws -> Data {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.httpCookieStorage = nil
    configuration.httpShouldSetCookies = false
    configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
    let session = URLSession(configuration: configuration)
    defer { session.invalidateAndCancel() }
    let (data, response) = try await session.data(from: url)
    guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
      throw HybridBundleUpdateError.invalidResponse
    }
    return data
  }
}
