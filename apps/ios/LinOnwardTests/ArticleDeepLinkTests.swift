import Foundation
import Testing
@testable import LinOnward

@Suite("Article links")
struct ArticleDeepLinkTests {
  @Test("parses an article deep link and its locale")
  func parsesDeepLink() throws {
    let link = try #require(
      ArticleDeepLink(url: URL(string: "linonward://article/hello-world?locale=en")!)
    )

    #expect(link.slug == "hello-world")
    #expect(link.locale == "en")
  }

  @Test("rejects links outside the article route", arguments: [
    "https://linonward.com/articles/hello-world",
    "linonward://profile/hello-world",
    "linonward://article/Hello-World",
    "linonward://article/hello-world/extra",
  ])
  func rejectsOtherLinks(rawValue: String) {
    #expect(ArticleDeepLink(url: URL(string: rawValue)!) == nil)
  }

  @Test("builds a browser share URL from the configured reader origin")
  func buildsShareURL() throws {
    let links = try #require(ArticleLinkConfiguration(rawValue: "https://read.linonward.com/"))

    #expect(
      links.webURL(slug: "hello-world", locale: "en")?.absoluteString
        == "https://read.linonward.com/articles/hello-world?locale=en"
    )
  }
}
