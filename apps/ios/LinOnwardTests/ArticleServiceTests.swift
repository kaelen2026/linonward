import Foundation
import Testing

@testable import LinOnward

@Suite("Article API")
struct ArticleServiceTests {
  @Test("builds the public article request for the active locale")
  func buildsRequest() throws {
    let requests = try #require(ArticleRequestFactory(baseURL: "http://localhost:3001/"))
    let request = try #require(requests.articles(locale: Locale(identifier: "en-US")))

    #expect(request.url?.absoluteString == "http://localhost:3001/api/content/articles?locale=en")
    #expect(request.httpMethod == "GET")
  }

  @Test("falls back to real Chinese content when English has no published articles")
  func buildsFallbackRequest() throws {
    let requests = try #require(ArticleRequestFactory(baseURL: "http://localhost:3001/"))
    let request = try #require(requests.fallbackArticles(locale: Locale(identifier: "en-US")))

    #expect(request.url?.absoluteString == "http://localhost:3001/api/content/articles?locale=zh")
    #expect(requests.fallbackArticles(locale: Locale(identifier: "zh-CN")) == nil)
  }

  @Test("decodes API rich text into the existing reader model")
  func decodesArticle() throws {
    let data = Data(
      """
      {
        "articles": [{
          "id": "art_1",
          "title": "API article",
          "content": {
            "type": "doc",
            "content": [{
              "type": "paragraph",
              "content": [
                {"type": "text", "text": "<safe>", "marks": [{"type": "strong"}]}
              ]
            }]
          },
          "coverImageUrl": "https://example.com/cover.jpg",
          "locale": "en",
          "status": "published",
          "authorName": "API Author",
          "slug": "api-article",
          "excerpt": "Excerpt",
          "seoDescription": "Description",
          "publishedAt": "2026-08-30T00:00:00.000Z",
          "createdAt": "2026-08-29T00:00:00.000Z",
          "updatedAt": "2026-08-30T00:00:00.000Z"
        }]
      }
      """.utf8
    )

    let article = try #require(try ArticleResponseDecoder().articles(from: data).first)
    #expect(article.id == "art_1")
    #expect(article.author == "API Author")
    #expect(article.contentHtml == "<p><strong>&lt;safe&gt;</strong></p>")
    #expect(article.cover?.url == "https://example.com/cover.jpg")
    #expect(article.readingMinutes == 1)
  }

  @Test("uses the last valid snapshot when the network is unavailable")
  func fallsBackToCache() async throws {
    let cached = ReaderArticle(
      author: "Offline author",
      contentHtml: "<p>Cached</p>",
      cover: nil,
      id: "cached",
      publishedAt: nil,
      readingMinutes: 1,
      title: "Offline article"
    )
    let cache = MemoryArticleCache(snapshot: [cached])
    let service = OfflineArticleService(remote: FailingArticleService(), cache: cache)

    #expect(try await service.articles(locale: Locale(identifier: "en-US")) == [cached])
  }

  @Test("replaces the snapshot only after a successful remote decode")
  func refreshesCache() async throws {
    let fresh = ReaderArticle(
      author: nil,
      contentHtml: "<p>Fresh</p>",
      cover: nil,
      id: "fresh",
      publishedAt: nil,
      readingMinutes: 1,
      title: "Fresh article"
    )
    let cache = MemoryArticleCache(snapshot: nil)
    let service = OfflineArticleService(
      remote: StubArticleService(result: .success([fresh])),
      cache: cache
    )

    #expect(try await service.articles(locale: Locale(identifier: "zh-CN")) == [fresh])
    #expect(await cache.snapshot == [fresh])
  }
}

@Suite("Article list presentation")
struct ArticleListPresentationTests {
  private let day = Date.ISO8601FormatStyle.iso8601Date(timeZone: .gmt)

  @Test("reads both the API timestamp and the fixture calendar day as the same day")
  func parsesEveryShapePublishedAtArrivesIn() throws {
    let expected = try day.parse("2026-08-30")

    #expect(ArticleDate.parse("2026-08-30T00:00:00.000Z") == expected)
    #expect(ArticleDate.parse("2026-08-30T00:00:00Z") == expected)
    #expect(ArticleDate.parse("2026-08-30") == expected)
  }

  @Test("resolves an absent or unreadable date to nothing rather than to 1970")
  func refusesToInventADate() {
    #expect(ArticleDate.parse(nil) == nil)
    #expect(ArticleDate.parse("") == nil)
    #expect(ArticleDate.parse("   ") == nil)
    #expect(ArticleDate.parse("not a date") == nil)
  }

  @Test("shows the day the article was published, not the reader's local day")
  func pinsTheDisplayedDayToTheRecordedZone() throws {
    let published = try day.parse("2026-08-30")

    var unpinned = ArticleDate.dayStyle
    unpinned.locale = Locale(identifier: "en_US")
    unpinned.timeZone = try #require(TimeZone(identifier: "America/Los_Angeles"))

    var displayed = ArticleDate.dayStyle
    displayed.locale = Locale(identifier: "en_US")

    // What the reader's own zone would have printed, and why the style pins it.
    #expect(published.formatted(unpinned) == "Aug 29, 2026")
    #expect(published.formatted(displayed) == "Aug 30, 2026")
  }

  @Test("gives an article the same cover tint on every launch")
  func keepsCoverTintStable() {
    #expect(
      ArticleCoverPalette.index(for: "art_1", count: 4)
        == ArticleCoverPalette.index(for: "art_1", count: 4)
    )
    #expect((0..<4).contains(ArticleCoverPalette.index(for: "art_1", count: 4)))
    #expect((0..<4).contains(ArticleCoverPalette.index(for: "", count: 4)))
  }

  @Test("spreads a list of articles across the whole palette")
  func spreadsCoverTints() {
    let used = Set((0..<40).map { ArticleCoverPalette.index(for: "art_\($0)", count: 4) })

    #expect(used.count == 4)
  }

  @Test("treats an empty palette as a missing tint, not a division by zero")
  func toleratesAnEmptyPalette() {
    #expect(ArticleCoverPalette.index(for: "art_1", count: 0) == 0)
  }
}

private struct FailingArticleService: ArticleService {
  func articles(locale: Locale) async throws -> [ReaderArticle] {
    throw ArticleServiceError.unavailable
  }
}

private struct StubArticleService: ArticleService {
  let result: Result<[ReaderArticle], Error>

  func articles(locale: Locale) async throws -> [ReaderArticle] {
    try result.get()
  }
}

private actor MemoryArticleCache: ArticleCache {
  private(set) var snapshot: [ReaderArticle]?

  init(snapshot: [ReaderArticle]?) {
    self.snapshot = snapshot
  }

  func load(locale: Locale) -> [ReaderArticle]? {
    snapshot
  }

  func save(_ articles: [ReaderArticle], locale: Locale) {
    snapshot = articles
  }
}
