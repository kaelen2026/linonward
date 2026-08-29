import Foundation
import Testing

@testable import LinOnward

@Suite("Article catalog")
struct ArticleCatalogTests {
  @Test("provides stable, distinct articles")
  func providesStableArticles() {
    let articles = ArticleCatalog.articles(locale: Locale(identifier: "en"))

    #expect(articles.count == 3)
    #expect(Set(articles.map(\.id)).count == articles.count)
    #expect(articles.allSatisfy { !$0.title.isEmpty && !$0.contentHtml.isEmpty })
  }

  @Test("localizes catalog content")
  func localizesContent() throws {
    let english = try #require(ArticleCatalog.articles(locale: Locale(identifier: "en")).first)
    let chinese = try #require(
      ArticleCatalog.articles(locale: Locale(identifier: "zh-Hans")).first
    )

    #expect(english.title == "Long-term thinking is more than persistence")
    #expect(chinese.title == "长期主义，不只是坚持得更久")
    #expect(english.title != chinese.title)
  }
}
