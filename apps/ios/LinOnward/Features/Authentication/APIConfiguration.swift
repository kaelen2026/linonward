import Foundation

/// The API origin this build talks to.
///
/// Read from `Info.plist`, which the xcconfig files fill in per configuration —
/// the same shape as `NEXT_PUBLIC_API_URL` in the web workspaces, and for the
/// same reason: one origin per build, chosen at build time, never guessed at
/// runtime.
struct APIConfiguration: Sendable {
  static let originKey = "LinOnwardAPIBaseURL"

  /// `nil` when the build supplied no usable origin. Release deliberately ships
  /// empty rather than inheriting the local default, so a release that nobody
  /// configured fails visibly on the sign-in screen instead of quietly trying
  /// to reach `localhost` on somebody's phone.
  let requests: AuthenticationRequestFactory?

  init(origin: String?) {
    requests = origin.flatMap(AuthenticationRequestFactory.init(baseURL:))
  }

  static func fromBundle(_ bundle: Bundle = .main) -> APIConfiguration {
    APIConfiguration(origin: bundle.object(forInfoDictionaryKey: originKey) as? String)
  }
}
