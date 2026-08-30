import OSLog
import SwiftUI

struct ArticleReaderView: View {
  private static let logger = Logger(
    subsystem: Bundle.main.bundleIdentifier ?? "com.linonward.app",
    category: "article-reader"
  )
  @Environment(\.colorScheme) private var colorScheme
  @Environment(\.dismiss) private var dismiss
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @Environment(\.locale) private var locale
  @Environment(\.openURL) private var openURL

  let article: ReaderArticle
  private let links: ArticleLinkConfiguration?

  @State private var configuration: ArticleReaderConfiguration?
  @State private var contentHeight = 0.0
  @State private var errorCode: String?
  @State private var preview: ArticlePreview?

  init(
    article: ReaderArticle = .sample,
    configuration: ArticleReaderConfiguration? = .preferred(),
    links: ArticleLinkConfiguration? = .fromBundle()
  ) {
    self.article = article
    self.links = links
    _configuration = State(initialValue: configuration)
  }

  var body: some View {
    Group {
      if let configuration {
        ArticleReaderWebView(
          article: article,
          configuration: configuration,
          settings: settings,
          onError: { code in
            Self.logger.error("Article reader bridge error: \(code, privacy: .public)")
            if code == "LOAD_FAILED", configuration.resourceRoot != ArticleReaderConfiguration.bundled.resourceRoot {
              HybridBundleStore.deactivate(configuration: configuration)
              self.configuration = .bundled
            }
            errorCode = code
          },
          onExternalURL: { openURL($0) },
          onHeightChange: { contentHeight = $0 },
          onImage: { preview = $0 }
        )
        .id(configuration.resourceRoot?.path ?? configuration.url.absoluteString)
        .accessibilityIdentifier("article.reader.webView")
      } else {
        ContentUnavailableView(
          "article.reader.unavailable.title",
          systemImage: "doc.text.magnifyingglass",
          description: Text("article.reader.unavailable.body")
        )
        .accessibilityIdentifier("article.reader.unavailable")
      }
    }
    .navigationTitle("article.reader.navigationTitle")
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      if let url = links?.webURL(slug: article.slug, locale: localeCode) {
        ToolbarItem(placement: .primaryAction) {
          ShareLink(item: url, subject: Text(article.title)) {
            Label("article.reader.share", systemImage: "square.and.arrow.up")
          }
          .accessibilityIdentifier("article.reader.share")
        }
      }
    }
    .alert(
      "article.reader.error.title",
      isPresented: Binding(
        get: { errorCode != nil },
        set: { if !$0 { errorCode = nil } }
      )
    ) {
      Button("common.dismiss") { errorCode = nil }
    } message: {
      Text("article.reader.error.body")
    }
    .sheet(item: $preview) { item in
      NavigationStack {
        AsyncImage(url: item.url) { image in
          image.resizable().scaledToFit()
        } placeholder: {
          ProgressView()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
        .accessibilityLabel(item.alt)
        .navigationTitle("article.reader.imagePreview")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .confirmationAction) {
            Button("common.done") { preview = nil }
          }
        }
      }
    }
  }

  private var settings: ReaderSettings {
    ReaderSettings(
      fontScale: fontScale,
      locale: locale.identifier,
      theme: colorScheme == .dark ? "dark" : "light"
    )
  }

  private var localeCode: String {
    locale.identifier.lowercased().hasPrefix("en") ? "en" : "zh"
  }

  private var fontScale: Double {
    switch dynamicTypeSize {
    case .xSmall: 0.85
    case .small: 0.9
    case .medium, .large: 1
    case .xLarge: 1.08
    case .xxLarge: 1.16
    case .xxxLarge: 1.24
    default: 1.3
    }
  }
}
