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
        }
      }
    }
    .background(Color(.systemGroupedBackground))
    .navigationTitle("reading.title")
    .task(id: locale.identifier) {
      await model.load(locale: locale)
    }
  }

  private func articleList(_ articles: [ReaderArticle]) -> some View {
    ScrollView {
      LazyVStack(spacing: DesignTokens.Spacing.lg) {
        ForEach(articles, id: \.id) { article in
          NavigationLink {
            ArticleReaderView(article: article)
          } label: {
            ArticleRow(article: article)
          }
          .buttonStyle(.plain)
          .accessibilityIdentifier("reading.article.\(article.id)")
        }
      }
      .frame(maxWidth: DesignTokens.Size.contentMaximumWidth)
      .padding(.horizontal, DesignTokens.Spacing.xl)
      .padding(.vertical, DesignTokens.Spacing.lg)
    }
  }
}

private struct ArticleRow: View {
  let article: ReaderArticle

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      ZStack(alignment: .bottomLeading) {
        LinearGradient(
          colors: [Color.brandNavy, Color.brandNavy.opacity(0.78), Color.brandTeal.opacity(0.8)],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        )

        Image(systemName: "text.book.closed.fill")
          .font(.system(size: 42, weight: .medium))
          .foregroundStyle(.white.opacity(0.9))
          .padding(DesignTokens.Spacing.xl)
      }
      .frame(height: 138)
      .clipShape(.rect(cornerRadius: DesignTokens.Radius.card))
      .accessibilityHidden(true)

      VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
        Text(article.title)
          .font(.title3.weight(.semibold))
          .foregroundStyle(.primary)
          .multilineTextAlignment(.leading)

        HStack(spacing: DesignTokens.Spacing.md) {
          if let author = article.author {
            Label(author, systemImage: "person")
          }
          if let readingMinutes = article.readingMinutes {
            Label("reading.minutes \(readingMinutes)", systemImage: "clock")
          }
        }
        .font(.caption)
        .foregroundStyle(.secondary)
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(.background, in: .rect(cornerRadius: DesignTokens.Radius.card))
    .overlay {
      RoundedRectangle(cornerRadius: DesignTokens.Radius.card)
        .stroke(.separator.opacity(0.35), lineWidth: 0.5)
    }
  }
}

#Preview("Reading") {
  NavigationStack {
    ReadingView(model: ReadingModel(service: PreviewArticleService()))
  }
}

private struct PreviewArticleService: ArticleService {
  func articles(locale: Locale) async throws -> [ReaderArticle] {
    [.sample]
  }
}
