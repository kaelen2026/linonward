import AuthenticationServices
import SwiftUI

/// Why the browser never handed back a redirect.
enum WebAuthenticationFailure: Error, Equatable, Sendable {
  /// Dismissed without finishing. A decision, not a fault — nothing to report.
  case declined
  /// The browser could not be presented, or failed on its own account.
  case unavailable
}

/// The system's authentication browser, as the Google flow needs it.
///
/// A seam rather than a direct call into SwiftUI, so the flow above it can be
/// exercised without a browser, and so the single place that has to know how a
/// dismissal is reported is the conformance directly below.
@MainActor
protocol WebAuthenticationBrowser {
  /// - Returns: the URL the provider redirected to, or why it never arrived.
  func authenticate(
    using url: URL,
    callbackScheme: String
  ) async -> Result<URL, WebAuthenticationFailure>
}

/// `WebAuthenticationSession` from the SwiftUI environment.
///
/// SwiftUI's own session is used rather than `ASWebAuthenticationSession`
/// directly because it anchors the presentation to the current scene by itself;
/// reaching for the UIKit type would mean finding a key window and carrying a
/// presentation-context delegate for no gain.
///
/// A real browser is also the point: Google rejects OAuth in an embedded web
/// view, and this one shares Safari's cookies, so somebody already signed in to
/// Google is one tap from done.
@MainActor
struct SystemWebAuthenticationBrowser: WebAuthenticationBrowser {
  private let session: WebAuthenticationSession

  init(session: WebAuthenticationSession) {
    self.session = session
  }

  func authenticate(
    using url: URL,
    callbackScheme: String
  ) async -> Result<URL, WebAuthenticationFailure> {
    do {
      return .success(try await session.authenticate(using: url, callbackURLScheme: callbackScheme))
    } catch {
      return .failure(Self.failure(from: error))
    }
  }

  /// Cancelling — the Cancel button, or swiping the sheet away — arrives as
  /// `canceledLogin`. It is read through `NSError` rather than through either
  /// framework's wrapper type because SwiftUI's `WebAuthenticationSession.Error`
  /// and `ASWebAuthenticationSessionError` are the same domain and code
  /// underneath, and that pair is stable API.
  private static func failure(from error: any Error) -> WebAuthenticationFailure {
    let failure = error as NSError
    let cancelled =
      failure.domain == ASWebAuthenticationSessionErrorDomain
      && failure.code == ASWebAuthenticationSessionError.Code.canceledLogin.rawValue
    return cancelled ? .declined : .unavailable
  }
}
