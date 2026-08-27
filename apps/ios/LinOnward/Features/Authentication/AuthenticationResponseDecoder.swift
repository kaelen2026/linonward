import Foundation

/// A completed sign-in: who signed in, and the token that proves it next time.
struct AuthenticatedSession: Equatable, Sendable {
  let user: AuthenticatedUser
  let token: String
}

/// Turns an auth API reply into a result, with no network stack involved.
///
/// Every response the app receives crosses an untrusted boundary, so nothing
/// here assumes a body is present, well-formed, or shaped as documented — a
/// 200 carrying junk is a failure, not a crash.
struct AuthenticationResponseDecoder: Sendable {
  init() {}

  /// `POST /sign-in/email-otp`.
  ///
  /// - Parameter authToken: the `set-auth-token` response header, which the
  ///   bearer plugin adds. It carries the *signed* cookie value; the `token` in
  ///   the body is the raw session token, which the plugin also accepts because
  ///   it signs an unsigned token itself. The header is preferred, and the body
  ///   is the fallback for a deployment where the header is stripped in transit.
  func signIn(
    status: Int,
    authToken: String?,
    data: Data
  ) -> Result<AuthenticatedSession, AuthenticationError> {
    if let failure = failure(status: status, data: data) { return .failure(failure) }
    guard let payload = try? JSONDecoder().decode(SignInPayload.self, from: data) else {
      return .failure(.unavailable)
    }

    guard let token = authToken?.trimmed.nonEmpty ?? payload.token?.trimmed.nonEmpty else {
      return .failure(.unavailable)
    }
    return .success(AuthenticatedSession(user: payload.user, token: token))
  }

  /// `GET /get-session`, which answers 200 with a literal `null` — not 401 —
  /// when the token is missing, expired, or revoked. `nil` therefore means
  /// signed out, and is not an error.
  func session(status: Int, data: Data) -> Result<AuthenticatedUser?, AuthenticationError> {
    if let failure = failure(status: status, data: data) { return .failure(failure) }
    let body = String(decoding: data, as: UTF8.self).trimmed
    if body.isEmpty || body == "null" { return .success(nil) }
    guard let payload = try? JSONDecoder().decode(SessionPayload.self, from: data) else {
      return .failure(.unavailable)
    }
    return .success(payload.user)
  }

  /// `POST /email-otp/send-verification-otp` and `POST /sign-out`, whose bodies
  /// carry nothing the app needs. `nil` means the API accepted the call.
  func acknowledgement(status: Int, data: Data) -> AuthenticationError? {
    failure(status: status, data: data)
  }

  /// `nil` for any 2xx; the mapped error otherwise.
  private func failure(status: Int, data: Data) -> AuthenticationError? {
    guard !(200..<300).contains(status) else { return nil }
    return AuthenticationError(
      status: status,
      payload: try? JSONDecoder().decode(AuthenticationFailurePayload.self, from: data)
    )
  }
}

extension String {
  fileprivate var trimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) }
  fileprivate var nonEmpty: String? { isEmpty ? nil : self }
}
