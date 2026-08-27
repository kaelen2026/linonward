import Foundation

/// One call to the auth API, described without reference to URLSession.
///
/// Keeping this a plain value — rather than building a `URLRequest` here — is
/// what lets the request shape be asserted in a test without a network stack,
/// and keeps every URLSession detail at a single edge in
/// `LiveAuthenticationService`.
struct AuthenticationRequest: Equatable, Sendable {
  let url: URL
  let method: String
  let headers: [String: String]
  let body: Data?
}

/// Builds the four requests the app makes against Better Auth, mounted by
/// `apps/api` under `/api/auth`.
struct AuthenticationRequestFactory: Sendable {
  private let baseURL: String

  /// - Parameter baseURL: the API origin, optionally with a path prefix.
  ///   Trailing slashes are tolerated; an empty or unparseable value is
  ///   rejected here so a misconfigured build fails at startup rather than on
  ///   somebody's first sign-in attempt.
  init?(baseURL: String) {
    let trimmed = baseURL.trimmingCharacters(in: .whitespacesAndNewlines)
    guard let url = URL(string: trimmed), url.scheme != nil, url.host != nil else { return nil }
    // Store the string, not the URL: joining is done textually below, and a
    // round trip through `URL` would re-append the slash just stripped.
    self.baseURL = trimmed.hasSuffix("/") ? String(trimmed.dropLast()) : trimmed
  }

  func sendVerificationCode(email: String) -> AuthenticationRequest? {
    post("email-otp/send-verification-otp", body: ["email": email, "type": "sign-in"])
  }

  func signIn(email: String, code: String) -> AuthenticationRequest? {
    post("sign-in/email-otp", body: ["email": email, "otp": code])
  }

  func session(token: String) -> AuthenticationRequest? {
    guard let url = url(for: "get-session") else { return nil }
    return AuthenticationRequest(
      url: url,
      method: "GET",
      headers: ["Accept": "application/json", "Authorization": "Bearer \(token)"],
      body: nil
    )
  }

  func signOut(token: String) -> AuthenticationRequest? {
    post("sign-out", body: [:], token: token)
  }

  private func post(
    _ path: String,
    body: [String: String],
    token: String? = nil
  ) -> AuthenticationRequest? {
    guard let url = url(for: path),
      let encoded = try? JSONEncoder().encode(body)
    else { return nil }

    var headers = ["Accept": "application/json", "Content-Type": "application/json"]
    if let token { headers["Authorization"] = "Bearer \(token)" }
    return AuthenticationRequest(url: url, method: "POST", headers: headers, body: encoded)
  }

  /// Joins a path onto the origin with exactly one slash between them.
  ///
  /// `URL(string:relativeTo:)` is the obvious alternative and the wrong one, for
  /// the same reason `apps/web` avoids `new URL(path, base)`: it treats the
  /// path as absolute and discards any base path, so an API deployed under
  /// `https://example.com/gateway` would lose the `/gateway`.
  private func url(for path: String) -> URL? {
    URL(string: "\(baseURL)/api/auth/\(path)")
  }
}
