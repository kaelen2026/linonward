import SwiftUI

struct ReadingView: View {
  @Environment(\.locale) private var locale

  var body: some View {
    ScrollView {
      LazyVStack(spacing: 16) {
        ForEach(ArticleCatalog.articles(locale: locale), id: \.id) { article in
          NavigationLink {
            ArticleReaderView(article: article)
          } label: {
            ArticleRow(article: article)
          }
          .buttonStyle(.plain)
          .accessibilityIdentifier("reading.article.\(article.id)")
        }
      }
      .frame(maxWidth: 680)
      .padding(.horizontal, 20)
      .padding(.vertical, 16)
    }
    .background(Color(.systemGroupedBackground))
    .navigationTitle("reading.title")
  }
}

private struct ArticleRow: View {
  let article: ReaderArticle

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      ZStack(alignment: .bottomLeading) {
        LinearGradient(
          colors: [Color.brandNavy, Color.brandNavy.opacity(0.78), Color.brandTeal.opacity(0.8)],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        )

        Image(systemName: "text.book.closed.fill")
          .font(.system(size: 42, weight: .medium))
          .foregroundStyle(.white.opacity(0.9))
          .padding(20)
      }
      .frame(height: 138)
      .clipShape(.rect(cornerRadius: 18))
      .accessibilityHidden(true)

      VStack(alignment: .leading, spacing: 8) {
        Text(article.title)
          .font(.title3.weight(.semibold))
          .foregroundStyle(.primary)
          .multilineTextAlignment(.leading)

        HStack(spacing: 12) {
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
    .padding(14)
    .background(.background, in: .rect(cornerRadius: 22))
    .overlay {
      RoundedRectangle(cornerRadius: 22)
        .stroke(.separator.opacity(0.35), lineWidth: 0.5)
    }
  }
}

#Preview("Reading") {
  NavigationStack {
    ReadingView()
  }
}
