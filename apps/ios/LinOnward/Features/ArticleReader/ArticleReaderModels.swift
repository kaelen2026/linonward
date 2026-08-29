import Foundation

struct ReaderArticleImage: Codable, Equatable, Sendable {
  let alt: String
  let caption: String?
  let url: String
}

struct ReaderArticle: Codable, Equatable, Sendable {
  let author: String?
  let contentHtml: String
  let cover: ReaderArticleImage?
  let id: String
  let publishedAt: String?
  let readingMinutes: Int?
  let title: String
}

struct ReaderArticlePayload: Codable, Equatable, Sendable {
  let article: ReaderArticle
  let settings: ReaderSettings?
}

struct ReaderSettings: Codable, Equatable, Sendable {
  let fontScale: Double
  let locale: String
  let theme: String
}

extension ReaderArticle {
  static let sample = ReaderArticle(
    author: "LinOnward 编辑部",
    contentHtml: """
      <p>在一个追求短期回报的世界里，长期主义常常被误解为“慢”和“保守”。但真正的长期主义，不是被动等待时间的眷顾，而是主动选择在时间的复利下，持续做对长期有价值的事。</p>
      <p>它不是口号，也不是情怀，而是一种面向未来的思考方式和行动策略：把目光放长远，把基础打扎实，把节奏守稳定，把复利交给时间。</p>
      <blockquote>真正的复利，来自持续做对长期有价值的事。</blockquote>
      <h2>把时间变成你的盟友</h2>
      <p>时间不会辜负认真生活的人。长期主义的第一步，是学会与时间合作，而不是与它赛跑。</p>
      <p><a href="https://linonward.com">了解 LinOnward</a></p>
      """,
    cover: ReaderArticleImage(
      alt: "山脊延伸到远方",
      caption: nil,
      url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85"
    ),
    id: "long-term-thinking",
    publishedAt: "2026-08-29",
    readingMinutes: 8,
    title: "长期主义，不只是坚持得更久"
  )
}

struct ArticlePreview: Identifiable, Equatable, Sendable {
  let alt: String
  let url: URL

  var id: URL { url }
}
