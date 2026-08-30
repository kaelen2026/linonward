import SwiftUI

struct ReadingView: View {
  @Environment(\.locale) private var locale
  @State private var model: ReadingModel

  init(model: ReadingModel = ReadingModel()) {
    _model = State(initialValue: model)
  }

  var body: some View {
    Group {
      switch model.state {
      case .idle, .loading:
        ProgressView("reading.loading")
          .controlSize(.large)
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      case .loaded(let articles) where articles.isEmpty:
        ContentUnavailableView(
          "reading.empty.title",
          systemImage: "text.book.closed",
          description: Text("reading.empty.body")
        )
      case .loaded(let articles):
        articleList(articles)
      case .failed:
        ContentUnavailableView {
          Label("reading.error.title", systemImage: "wifi.exclamationmark")
        } description: {
          Text("reading.error.body")
        } actions: {
          Button("reading.retry") {
            Task { await model.load(locale: locale) }
          }
          .buttonStyle(.borderedProminent)
          .buttonBorderShape(.roundedRectangle(radius: DesignTokens.Radius.card))
        }
      }
    }
    .background(Color(.systemGroupedBackground))
    .navigationTitle("reading.title")
    .task(id: locale.identifier) {
      await model.load(locale: locale)
    }
  }

  // The newest article leads at full width and the rest follow as digest rows.
  // A uniform stack of identical cards gives a reader nothing to land on; the
  // size difference is what says "start here" without any extra copy.
  private func articleList(_ articles: [ReaderArticle]) -> some View {
    let lead = articles.first
    let rest = Array(articles.dropFirst())

    // Every row is a direct child of the `LazyVStack`, so a long response
    // builds — and starts downloading its cover — on scroll rather than all at
    // once. Wrapping the tail in a plain `VStack` to draw one grouped card
    // would collapse the whole list into a single lazy child and defeat that.
    return ScrollView {
      LazyVStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
        if let lead {
          link(to: lead) { LeadArticleCard(article: lead) }
            .padding(.bottom, DesignTokens.Spacing.md)
        }

        if !rest.isEmpty {
          Text("reading.more")
            .font(.title3.weight(.semibold))
            .accessibilityAddTraits(.isHeader)
            .padding(.top, DesignTokens.Spacing.xs)
        }

        ForEach(rest, id: \.id) { article in
          link(to: article) { ArticleDigestRow(article: article) }
        }
      }
      .frame(maxWidth: DesignTokens.Size.contentMaximumWidth)
      .padding(.horizontal, DesignTokens.Spacing.xl)
      .padding(.vertical, DesignTokens.Spacing.lg)
    }
  }

  private func link(
    to article: ReaderArticle,
    @ViewBuilder label: () -> some View
  ) -> some View {
    NavigationLink {
      ArticleReaderView(article: article)
    } label: {
      label()
    }
    .buttonStyle(.plain)
    .accessibilityIdentifier("reading.article.\(article.id)")
  }
}

/// The lead story: cover, headline, byline. Modelled on the top-story card in
/// Apple News — one large image the eye reaches before any text.
private struct LeadArticleCard: View {
  let article: ReaderArticle

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      ArticleCover(article: article, glyphSize: 44)
        .frame(height: 190)

      VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
        Text(article.title)
          .font(.title2.weight(.bold))
          .foregroundStyle(.primary)
          .multilineTextAlignment(.leading)
          // Without this a long headline is truncated rather than wrapped once
          // Dynamic Type is turned up.
          .fixedSize(horizontal: false, vertical: true)

        ArticleByline(article: article)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(DesignTokens.Spacing.lg)
    }
    .background(Color(.secondarySystemGroupedBackground))
    .clipShape(.rect(cornerRadius: DesignTokens.Radius.card, style: .continuous))
    .overlay {
      RoundedRectangle(cornerRadius: DesignTokens.Radius.card, style: .continuous)
        .strokeBorder(.separator.opacity(0.35), lineWidth: 0.5)
    }
    // No `accessibilityElement(children: .combine)`: the enclosing
    // `NavigationLink` already combines its label and carries the button trait,
    // and combining again inside it can shadow the link's automation id.
  }
}

/// Everything below the lead: headline and byline, with the cover reduced to a
/// thumbnail so one scroll shows several at once.
private struct ArticleDigestRow: View {
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @ScaledMetric(relativeTo: .headline) private var thumbnail: CGFloat = 66

  let article: ReaderArticle

  var body: some View {
    HStack(alignment: .top, spacing: DesignTokens.Spacing.lg) {
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        Text(article.title)
          .font(.headline)
          .foregroundStyle(.primary)
          .multilineTextAlignment(.leading)
          .fixedSize(horizontal: false, vertical: true)

        ArticleByline(article: article)
      }
      .frame(maxWidth: .infinity, alignment: .leading)

      // At accessibility sizes the thumbnail would grow past 200pt and squeeze
      // the headline into two characters a line. The headline is the point of
      // the row, so the cover gives way instead.
      if !dynamicTypeSize.isAccessibilitySize {
        ArticleCover(article: article, glyphSize: thumbnail * 0.32)
          .frame(width: thumbnail, height: thumbnail)
          .clipShape(.rect(cornerRadius: DesignTokens.Radius.card, style: .continuous))
      }
    }
    .padding(DesignTokens.Spacing.lg)
    .background(Color(.secondarySystemGroupedBackground))
    .clipShape(.rect(cornerRadius: DesignTokens.Radius.card, style: .continuous))
    .overlay {
      RoundedRectangle(cornerRadius: DesignTokens.Radius.card, style: .continuous)
        .strokeBorder(.separator.opacity(0.35), lineWidth: 0.5)
    }
    // The row is a link, so the whole rectangle has to be tappable — not only
    // the glyphs inside it.
    .contentShape(.rect)
  }
}

/// The published cover where the article has one, and a tinted tile where it
/// does not.
private struct ArticleCover: View {
  private static let gradients: [[Color]] = [
    [.navy800, .teal600],
    [.navy900, .navy600],
    [.teal700, .teal400],
    [.navy700, .teal500],
  ]

  let article: ReaderArticle
  let glyphSize: CGFloat

  var body: some View {
    LinearGradient(colors: gradient, startPoint: .topLeading, endPoint: .bottomTrailing)
      .overlay {
        if let url = coverURL {
          // The gradient stays behind it, so a slow or failed download degrades
          // to the tile rather than to a grey hole.
          AsyncImage(
            url: url,
            transaction: Transaction(animation: .easeOut(duration: 0.2))
          ) { phase in
            if let image = phase.image {
              image
                .resizable()
                .scaledToFill()
                .transition(.opacity)
            }
          }
        } else {
          Image(systemName: "text.book.closed.fill")
            .font(.system(size: glyphSize, weight: .medium))
            .foregroundStyle(.white.opacity(0.85))
        }
      }
      .clipped()
      .accessibilityHidden(true)
  }

  private var coverURL: URL? {
    article.cover.flatMap { URL(string: $0.url) }
  }

  private var gradient: [Color] {
    Self.gradients[ArticleCoverPalette.index(for: article.id, count: Self.gradients.count)]
  }
}

/// Author, date, and reading time as one run of text. Three separate labels in
/// an `HStack` collide at large Dynamic Type sizes; a single `Text` wraps.
private struct ArticleByline: View {
  let article: ReaderArticle

  var body: some View {
    // An empty `Text` would still reserve a caption line under the headline.
    if let line {
      line
        .font(.caption)
        .foregroundStyle(.secondary)
    }
  }

  private var line: Text? {
    var parts: [Text] = []

    if let author = article.author, !author.isEmpty {
      parts.append(Text(author))
    }
    if let published = ArticleDate.parse(article.publishedAt) {
      parts.append(Text(published, format: ArticleDate.dayStyle))
    }
    if let minutes = article.readingMinutes {
      parts.append(Text("reading.minutes \(minutes)"))
    }

    guard let first = parts.first else { return nil }
    return parts.dropFirst().reduce(first) { $0 + Text(verbatim: " · ") + $1 }
  }
}

// Fixtures carry no cover URL on purpose: a preview must not reach the network,
// and it is also the state most published articles are in.
#Preview("Reading") {
  NavigationStack {
    ReadingView(model: ReadingModel(service: PreviewArticleService()))
  }
}

#Preview("Reading · one article") {
  NavigationStack {
    ReadingView(model: ReadingModel(service: PreviewArticleService(count: 1)))
  }
}

#Preview("简体中文 · Dark") {
  NavigationStack {
    ReadingView(model: ReadingModel(service: PreviewArticleService()))
  }
  .environment(\.locale, Locale(identifier: "zh-Hans"))
  .preferredColorScheme(.dark)
}

#Preview("Accessibility XL") {
  NavigationStack {
    ReadingView(model: ReadingModel(service: PreviewArticleService()))
  }
  .environment(\.dynamicTypeSize, .accessibility3)
}

private struct PreviewArticleService: ArticleService {
  var count = 4

  func articles(locale: Locale) async throws -> [ReaderArticle] {
    (0..<count).map { position in
      ReaderArticle(
        author: ReaderArticle.sample.author,
        contentHtml: ReaderArticle.sample.contentHtml,
        cover: nil,
        id: "preview-\(position)",
        publishedAt: String(format: "2026-08-%02d", max(1, 29 - position)),
        readingMinutes: 4 + position,
        title: position == 0
          ? ReaderArticle.sample.title
          : "\(ReaderArticle.sample.title) \(position)"
      )
    }
  }
}
