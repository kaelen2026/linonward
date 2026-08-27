import Foundation

/// Everything the sign-in screen can put in front of somebody.
///
/// The cases are the ones a person can act on differently — retype the code,
/// ask for a new one, wait, check the network. Failures with the same remedy
/// collapse into `unavailable` rather than leaking a backend string that is
/// English-only and written for an operator.
enum AuthenticationError: Error, Equatable, Sendable {
  /// No API origin is configured in the build, so no request can be made.
  case notConfigured
  /// The request never reached the API, or the reply was unreadable.
  case network
  /// The code was wrong.
  case invalidCode
  /// The code was right once, but it has aged out.
  case expiredCode
  /// Too many wrong codes; this one needs a fresh send.
  case tooManyAttempts
  /// The API answered, but not with anything the app can use.
  case unavailable
}

extension AuthenticationError {
  /// Maps a Better Auth error reply onto a case.
  ///
  /// The `code` is the contract worth reading: `message` is prose that changes
  /// between releases, while the codes come from the email-OTP plugin's
  /// published `EMAIL_OTP_ERROR_CODES`.
  init(status: Int, payload: AuthenticationFailurePayload?) {
    switch payload?.code {
    case "INVALID_OTP":
      self = .invalidCode
    case "OTP_EXPIRED":
      self = .expiredCode
    case "TOO_MANY_ATTEMPTS":
      self = .tooManyAttempts
    default:
      // 429 has no plugin code — it is the API's own rate limiter — and reads
      // to a person exactly like having burned their attempts.
      self = status == 429 ? .tooManyAttempts : .unavailable
    }
  }

  /// The key the sign-in screen looks up in `Localizable.xcstrings`.
  ///
  /// A key rather than a resolved string: this type is deliberately free of
  /// SwiftUI so it can be tested without a UI, and the view wraps the key in a
  /// `LocalizedStringKey`. Xcode cannot extract a key built at runtime, so
  /// every case here needs its entry added to the catalog by hand.
  var messageKey: String {
    switch self {
    case .notConfigured: "auth.error.notConfigured"
    case .network: "auth.error.network"
    case .invalidCode: "auth.error.invalidCode"
    case .expiredCode: "auth.error.expiredCode"
    case .tooManyAttempts: "auth.error.tooManyAttempts"
    case .unavailable: "auth.error.unavailable"
    }
  }

  /// Whether the person should be sent back to the email step instead of being
  /// invited to retype a code that can no longer succeed.
  var requiresNewCode: Bool {
    self == .expiredCode || self == .tooManyAttempts
  }
}
