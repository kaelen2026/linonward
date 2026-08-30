import Foundation

struct ArticleDeepLink: Equatable, Sendable {
  static let scheme = "linonward"

  let slug: String
  let locale: String

  init?(url: URL) {
    guard url.scheme == Self.scheme, url.host == "article" else { return nil }
    let components = url.pathComponents.filter { $0 != "/" }
    guard components.count == 1, let slug = components.first, Self.isSlug(slug) else { return nil }

    let query = URLComponents(url: url, resolvingAgainstBaseURL: false)
    let locale = query?.queryItems?.first(where: { $0.name == "locale" })?.value
    self.slug = slug
    self.locale = locale == "en" ? "en" : "zh"
  }

  static func url(slug: String, locale: String) -> URL? {
    guard isSlug(slug) else { return nil }
    var components = URLComponents()
    components.scheme = scheme
    components.host = "article"
    components.path = "/\(slug)"
    components.queryItems = [URLQueryItem(name: "locale", value: locale == "en" ? "en" : "zh")]
    return components.url
  }

  private static func isSlug(_ value: String) -> Bool {
    let segments = value.split(separator: "-", omittingEmptySubsequences: false)
    return !value.isEmpty && segments.allSatisfy { segment in
      !segment.isEmpty && segment.allSatisfy { character in
        character.isASCII && (character.isLowercase || character.isNumber)
      }
    }
  }
}

struct ArticleLinkConfiguration: Equatable, Sendable {
  static let bundleKey = ArticleReaderConfiguration.bundleKey

  private let origin: URL

  init?(rawValue: String?) {
    guard
      let rawValue,
      var components = URLComponents(string: rawValue),
      components.user == nil,
      components.password == nil,
      components.query == nil,
      components.fragment == nil,
      components.host != nil,
      components.scheme == "https" || (components.scheme == "http" && components.host == "localhost")
    else { return nil }
    components.path = "/"
    guard let origin = components.url else { return nil }
    self.origin = origin
  }

  static func fromBundle(_ bundle: Bundle = .main) -> ArticleLinkConfiguration? {
    ArticleLinkConfiguration(rawValue: bundle.object(forInfoDictionaryKey: bundleKey) as? String)
  }

  func webURL(slug: String, locale: String) -> URL? {
    guard let deepLink = ArticleDeepLink.url(slug: slug, locale: locale) else { return nil }
    var components = URLComponents(
      url: origin.appending(path: "articles").appending(path: slug),
      resolvingAgainstBaseURL: false
    )
    components?.queryItems = URLComponents(url: deepLink, resolvingAgainstBaseURL: false)?.queryItems
    return components?.url
  }
}
