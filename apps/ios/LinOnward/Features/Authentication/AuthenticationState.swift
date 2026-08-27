import Foundation

/// The sign-in flow's state and every legal transition through it.
///
/// Deliberately free of SwiftUI, Observation, Keychain and URLSession: this is
/// the part of authentication that is easy to get wrong — a code field left
/// populated after a failure, a spinner that never stops, a person stranded on
/// a code screen after burning their attempts — and keeping it a plain value
/// is what makes all of that testable without a simulator.
struct AuthenticationState: Equatable, Sendable {
  /// Which screen the person is looking at.
  enum Step: Equatable, Sendable {
    /// Checking a stored token before showing anything. The launch state, so
    /// a returning person never sees the sign-in form flash past.
    case restoring
    /// Asking for an email address.
    case email
    /// Asking for the code just sent to `email`.
    case code
    /// Done.
    case signedIn(AuthenticatedUser)
  }

  /// Matches Better Auth's default OTP length.
  static let verificationCodeLength = 6

  var email = ""
  var code = ""
  private(set) var step: Step = .restoring
  private(set) var isBusy = false
  private(set) var error: AuthenticationError?

  /// The address to actually send, with the whitespace an iOS keyboard likes to
  /// append after autocomplete removed.
  var trimmedEmail: String {
    email.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  /// Enough of an address to be worth a round trip. The API is the authority on
  /// whether it is deliverable; this only stops an obviously empty submission.
  var canSendCode: Bool {
    guard !isBusy else { return false }
    let parts = trimmedEmail.split(separator: "@", omittingEmptySubsequences: false)
    return parts.count == 2 && !parts[0].isEmpty && parts[1].contains(".")
  }

  var canVerifyCode: Bool {
    !isBusy && code.count == Self.verificationCodeLength && code.allSatisfy(\.isNumber)
  }

  mutating func beginRequest() {
    isBusy = true
    error = nil
  }

  /// A request came back unhappy.
  ///
  /// A code that expired or ran out of attempts cannot be rescued by retyping
  /// it, so those send the person back to request a new one rather than leaving
  /// them poking at a dead code.
  mutating func failed(_ error: AuthenticationError) {
    isBusy = false
    self.error = error
    if error.requiresNewCode {
      code = ""
      step = .email
    }
  }

  mutating func codeSent() {
    isBusy = false
    error = nil
    email = trimmedEmail
    code = ""
    step = .code
  }

  mutating func signedIn(_ user: AuthenticatedUser) {
    isBusy = false
    error = nil
    code = ""
    step = .signedIn(user)
  }

  /// No session, by any route: nothing stored at launch, a rejected token, or
  /// signing out. Clears the code but keeps the address, so somebody who just
  /// signed out is one tap from a new code.
  mutating func signedOut() {
    isBusy = false
    error = nil
    code = ""
    step = .email
  }

  /// "Use a different address" — an explicit step back, not a failure.
  mutating func editEmail() {
    error = nil
    code = ""
    step = .email
  }
}
