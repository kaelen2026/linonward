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
      LiveArticleService(requests: requests)
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
