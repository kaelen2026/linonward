import Foundation

protocol ArticleService: Sendable {
  func articles(locale: Locale) async throws -> [ReaderArticle]
}

struct ArticleRequestFactory: Sendable {
  private let baseURL: URL

  init?(baseURL: String?) {
    guard
      let baseURL,
      var components = URLComponents(string: baseURL),
      components.scheme == "http" || components.scheme == "https",
      components.host != nil,
      components.user == nil,
      components.password == nil,
      components.query == nil,
      components.fragment == nil
    else { return nil }

    let path = components.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    components.path = path.isEmpty ? "" : "/\(path)"
    guard let url = components.url else { return nil }
    self.baseURL = url
  }

  func articles(locale: Locale) -> URLRequest? {
    articles(localeCode: Self.localeCode(for: locale))
  }

  func fallbackArticles(locale: Locale) -> URLRequest? {
    guard Self.localeCode(for: locale) == "en" else { return nil }
    return articles(localeCode: "zh")
  }

  private func articles(localeCode: String) -> URLRequest? {
    var components = URLComponents(
      url: baseURL.appending(path: "api/content/articles"),
      resolvingAgainstBaseURL: false
    )
    components?.queryItems = [
      URLQueryItem(
        name: "locale",
        value: localeCode
      )
    ]
    guard let url = components?.url else { return nil }
    return URLRequest(url: url)
  }

  private static func localeCode(for locale: Locale) -> String {
    locale.identifier.lowercased().hasPrefix("en") ? "en" : "zh"
  }
}

struct LiveArticleService: ArticleService {
  private let requests: ArticleRequestFactory
  private let session: URLSession

  init(requests: ArticleRequestFactory, session: URLSession = .authentication) {
    self.requests = requests
    self.session = session
  }

  func articles(locale: Locale) async throws -> [ReaderArticle] {
    guard let request = requests.articles(locale: locale) else {
      throw ArticleServiceError.invalidRequest
    }
    let articles = try await fetch(request)
    guard articles.isEmpty, let fallbackRequest = requests.fallbackArticles(locale: locale) else {
      return articles
    }
    return try await fetch(fallbackRequest)
  }

  private func fetch(_ request: URLRequest) async throws -> [ReaderArticle] {
    let (data, response) = try await session.data(for: request)
    guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
      throw ArticleServiceError.unavailable
    }
    return try ArticleResponseDecoder().articles(from: data)
  }
}

enum ArticleServiceError: Error {
  case invalidRequest
  case unavailable
}

struct ArticleResponseDecoder {
  func articles(from data: Data) throws -> [ReaderArticle] {
    let response = try JSONDecoder().decode(ArticlesResponse.self, from: data)
    return response.articles.map(\.readerArticle)
  }
}

private struct ArticlesResponse: Decodable {
  let articles: [PublishedArticle]
}

private struct PublishedArticle: Decodable {
  let authorName: String
  let content: RichTextNode
  let coverImageUrl: String?
  let id: String
  let publishedAt: String?
  let title: String
  let updatedAt: String

  var readerArticle: ReaderArticle {
    ReaderArticle(
      author: authorName,
      contentHtml: content.html,
      cover: coverImageUrl.map {
        ReaderArticleImage(alt: title, caption: nil, url: $0)
      },
      id: id,
      publishedAt: publishedAt ?? updatedAt,
      readingMinutes: max(1, Int(ceil(Double(content.characterCount) / 400))),
      title: title
    )
  }
}

private struct RichTextNode: Decodable {
  struct Attributes: Decodable {
    let href: String?
    let level: Int?
  }

  struct Mark: Decodable {
    let attrs: Attributes?
    let type: String
  }

  let attrs: Attributes?
  let content: [RichTextNode]?
  let marks: [Mark]?
  let text: String?
  let type: String

  var characterCount: Int {
    (text?.filter { !$0.isWhitespace }.count ?? 0) +
      (content ?? []).reduce(0) { $0 + $1.characterCount }
  }

  var html: String {
    if type == "text" {
      return (marks ?? []).reduce(text?.escapedHTML ?? "") { result, mark in
        switch mark.type {
        case "strong": "<strong>\(result)</strong>"
        case "em": "<em>\(result)</em>"
        case "code": "<code>\(result)</code>"
        case "link": mark.attrs?.href.map { "<a href=\"\($0.escapedHTML)\">\(result)</a>" } ?? result
        default: result
        }
      }
    }

    let children = (content ?? []).map(\.html).joined()
    switch type {
    case "paragraph": return "<p>\(children)</p>"
    case "heading": return attrs?.level == 1 ? "<h2>\(children)</h2>" : "<h3>\(children)</h3>"
    case "blockquote": return "<blockquote>\(children)</blockquote>"
    case "bullet_list": return "<ul>\(children)</ul>"
    case "ordered_list": return "<ol>\(children)</ol>"
    case "list_item": return "<li>\(children)</li>"
    case "hard_break": return "<br>"
    default: return children
    }
  }
}

private extension String {
  var escapedHTML: String {
    replacingOccurrences(of: "&", with: "&amp;")
      .replacingOccurrences(of: "<", with: "&lt;")
      .replacingOccurrences(of: ">", with: "&gt;")
      .replacingOccurrences(of: "\"", with: "&quot;")
      .replacingOccurrences(of: "'", with: "&#039;")
  }
}
