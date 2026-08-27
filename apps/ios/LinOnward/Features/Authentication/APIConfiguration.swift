import Foundation

/// What this build talks to: the API origin, and the Google client it may sign
/// in with.
///
/// Read from `Info.plist`, which the xcconfig files fill in per configuration —
/// the same shape as `NEXT_PUBLIC_API_URL` in the web workspaces, and for the
/// same reason: one origin per build, chosen at build time, never guessed at
/// runtime.
struct APIConfiguration: Sendable {
  static let originKey = "LinOnwardAPIBaseURL"
  static let googleClientKey = "LinOnwardGoogleClientID"

  /// `nil` when the build supplied no usable origin. Release deliberately ships
  /// empty rather than inheriting the local default, so a release that nobody
  /// configured fails visibly on the sign-in screen instead of quietly trying
  /// to reach `localhost` on somebody's phone.
  let requests: AuthenticationRequestFactory?

  /// `nil` when this build carries no Google client, which is the default.
  /// Google sign-in needs an OAuth client registered against this bundle id and
  /// an API that accepts it, so a build without one hides the button rather
  /// than offering a journey that ends on Google's error page.
  let googleClient: GoogleClient?

  init(origin: String?, googleClientID: String?) {
    requests = origin.flatMap(AuthenticationRequestFactory.init(baseURL:))
    googleClient = GoogleClient(identifier: googleClientID)
  }

  static func fromBundle(_ bundle: Bundle = .main) -> APIConfiguration {
    APIConfiguration(
      origin: bundle.object(forInfoDictionaryKey: originKey) as? String,
      googleClientID: bundle.object(forInfoDictionaryKey: googleClientKey) as? String
    )
  }
}
