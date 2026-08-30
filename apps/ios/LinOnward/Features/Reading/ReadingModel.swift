import Foundation
import Observation

@MainActor
@Observable
final class ReadingModel {
  enum State: Equatable {
    case idle
    case loading
    case loaded([ReaderArticle])
    case failed
  }

  private(set) var state: State = .idle
  private let service: (any ArticleService)?

  init(service: (any ArticleService)?) {
    self.service = service
  }

  convenience init(bundle: Bundle = .main) {
    let origin = bundle.object(forInfoDictionaryKey: APIConfiguration.originKey) as? String
    let service = ArticleRequestFactory(baseURL: origin).map { requests in
      let remote = LiveArticleService(requests: requests)
      guard let cache = FileArticleCache() else { return remote as any ArticleService }
      return OfflineArticleService(remote: remote, cache: cache) as any ArticleService
    }
    self.init(service: service)
  }

  func load(locale: Locale) async {
    guard state != .loading else { return }
    guard let service else {
      state = .failed
      return
    }

    state = .loading
    do {
      state = .loaded(try await service.articles(locale: locale))
    } catch is CancellationError {
      state = .idle
    } catch {
      state = .failed
    }
  }
}

/// `publishedAt` reaches the list two ways: the API sends a full ISO-8601
/// timestamp, while fixtures and older cached snapshots carry a plain calendar
/// day. Both have to land on the same displayed date, and anything else has to
/// resolve to nothing — a lenient parser would date the article to 1970 and
/// print that under the title.
enum ArticleDate {
  private static let timestamp = Date.ISO8601FormatStyle(includingFractionalSeconds: true)
  private static let wholeSecondTimestamp = Date.ISO8601FormatStyle()
  private static let calendarDay = Date.ISO8601FormatStyle.iso8601Date(timeZone: .gmt)

  static func parse(_ value: String?) -> Date? {
    guard
      let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines),
      !trimmed.isEmpty
    else { return nil }

    return (try? timestamp.parse(trimmed))
      ?? (try? wholeSecondTimestamp.parse(trimmed))
      ?? (try? calendarDay.parse(trimmed))
  }

  /// A publish date is a calendar day, not an instant. The API records it in
  /// UTC and a fixture carries no time at all, so rendering it in the reader's
  /// own zone prints 30 August as 29 August everywhere west of Greenwich.
  /// Pinning the display to UTC keeps the date the editor entered.
  static var dayStyle: Date.FormatStyle {
    var style = Date.FormatStyle.dateTime.year().month().day()
    style.timeZone = .gmt
    return style
  }
}

/// Most published articles carry no cover image, and drawing every one of them
/// with the same tile turns the list into wallpaper. Deriving the tint from the
/// article id gives the list variety while keeping a given article the same
/// colour on every launch — which `hashValue` would not, because Swift seeds it
/// per process.
enum ArticleCoverPalette {
  static func index(for id: String, count: Int) -> Int {
    guard count > 0 else { return 0 }

    // FNV-1a, for a stable spread across a handful of buckets.
    var hash: UInt64 = 0xcbf2_9ce4_8422_2325
    for byte in id.utf8 {
      hash ^= UInt64(byte)
      hash &*= 0x0000_0100_0000_01b3
    }
    return Int(hash % UInt64(count))
  }
}
