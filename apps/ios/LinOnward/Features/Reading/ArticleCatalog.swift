import Foundation

enum ArticleCatalog {
  static func articles(locale: Locale) -> [ReaderArticle] {
    [
      article(
        id: "long-term-thinking",
        titleKey: "reading.article.longTerm.title",
        bodyKey: "reading.article.longTerm.body",
        minutes: 8,
        locale: locale
      ),
      article(
        id: "growth-systems",
        titleKey: "reading.article.growth.title",
        bodyKey: "reading.article.growth.body",
        minutes: 6,
        locale: locale
      ),
      article(
        id: "signal-and-noise",
        titleKey: "reading.article.signal.title",
        bodyKey: "reading.article.signal.body",
        minutes: 5,
        locale: locale
      ),
    ]
  }

  private static func article(
    id: String,
    titleKey: String.LocalizationValue,
    bodyKey: String.LocalizationValue,
    minutes: Int,
    locale: Locale
  ) -> ReaderArticle {
    let bundle = localizedBundle(for: locale)
    return ReaderArticle(
      author: String(localized: "reading.editor", bundle: bundle, locale: locale),
      contentHtml: String(localized: bodyKey, bundle: bundle, locale: locale),
      cover: nil,
      id: id,
      publishedAt: "2026-08-29",
      readingMinutes: minutes,
      title: String(localized: titleKey, bundle: bundle, locale: locale)
    )
  }

  private static func localizedBundle(for locale: Locale) -> Bundle {
    let localization = Bundle.preferredLocalizations(
      from: Bundle.main.localizations,
      forPreferences: [locale.identifier]
    ).first

    guard
      let localization,
      let path = Bundle.main.path(forResource: localization, ofType: "lproj"),
      let bundle = Bundle(path: path)
    else {
      return .main
    }
    return bundle
  }
}
