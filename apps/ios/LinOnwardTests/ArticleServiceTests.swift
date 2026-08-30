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
}
