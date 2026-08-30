import Foundation

struct ArticleReaderConfiguration: Equatable, Sendable {
  static let bundleKey = "LinOnwardArticleReaderURL"

  let url: URL

  init?(rawValue: String?, allowsLocalhostHTTP: Bool = false) {
    guard
      let value = rawValue?.trimmingCharacters(in: .whitespacesAndNewlines),
      !value.isEmpty,
      let components = URLComponents(string: value),
      components.user == nil,
      components.password == nil,
      components.fragment == nil,
      let scheme = components.scheme?.lowercased(),
      let host = components.host?.lowercased()
    else { return nil }

    let isSecure = scheme == "https"
    let isLocalDevelopment =
      allowsLocalhostHTTP && scheme == "http" && Self.localHosts.contains(host)
    guard isSecure || isLocalDevelopment, let url = components.url else { return nil }
    self.url = url
  }

  static func fromBundle(_ bundle: Bundle = .main) -> ArticleReaderConfiguration? {
    #if DEBUG
      let allowsLocalhostHTTP = true
    #else
      let allowsLocalhostHTTP = false
    #endif
    return ArticleReaderConfiguration(
      rawValue: bundle.object(forInfoDictionaryKey: bundleKey) as? String,
      allowsLocalhostHTTP: allowsLocalhostHTTP
    )
  }

  func articleURL(id: String) -> URL {
    url.appending(path: "articles").appending(path: id)
  }

  func allowsMainFrameNavigation(to candidate: URL) -> Bool {
    guard let expected = URLComponents(url: url, resolvingAgainstBaseURL: false),
      let actual = URLComponents(url: candidate, resolvingAgainstBaseURL: false)
    else { return false }
    let sameOrigin = expected.scheme?.lowercased() == actual.scheme?.lowercased()
      && expected.host?.lowercased() == actual.host?.lowercased()
      && effectivePort(expected) == effectivePort(actual)
    guard sameOrigin else { return false }

    let expectedPath = expected.path
    let allowedPrefix = expectedPath.hasSuffix("/")
      ? expectedPath
      : (expectedPath as NSString).deletingLastPathComponent + "/"
    return actual.path == expectedPath || actual.path.hasPrefix(allowedPrefix)
  }

  private static let localHosts = ["localhost", "127.0.0.1", "::1"]

  private func effectivePort(_ components: URLComponents) -> Int? {
    if let port = components.port { return port }
    return components.scheme?.lowercased() == "https" ? 443 : 80
  }
}
