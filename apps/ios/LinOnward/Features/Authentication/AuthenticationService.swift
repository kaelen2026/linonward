import Foundation

/// The four calls the app makes against the auth API.
///
/// Failures come back as values rather than thrown errors: every one of them is
/// something the sign-in screen renders, and none is exceptional.
protocol AuthenticationService: Sendable {
  /// `nil` when the API accepted the request.
  func sendVerificationCode(to email: String) async -> AuthenticationError?
  func signIn(email: String, code: String) async -> Result<AuthenticatedSession, AuthenticationError>
  /// `nil` inside `.success` means the token is no longer good for a session.
  func currentUser(token: String) async -> Result<AuthenticatedUser?, AuthenticationError>
  /// `nil` when the session was revoked server-side.
  func signOut(token: String) async -> AuthenticationError?
}

struct LiveAuthenticationService: AuthenticationService {
  private let requests: AuthenticationRequestFactory
  private let responses = AuthenticationResponseDecoder()
  private let session: URLSession

  init(requests: AuthenticationRequestFactory, session: URLSession = .authentication) {
    self.requests = requests
    self.session = session
  }

  func sendVerificationCode(to email: String) async -> AuthenticationError? {
    guard let reply = await perform(requests.sendVerificationCode(email: email)) else {
      return .network
    }
    return responses.acknowledgement(status: reply.status, data: reply.data)
  }

  func signIn(
    email: String,
    code: String
  ) async -> Result<AuthenticatedSession, AuthenticationError> {
    guard let reply = await perform(requests.signIn(email: email, code: code)) else {
      return .failure(.network)
    }
    return responses.signIn(status: reply.status, authToken: reply.authToken, data: reply.data)
  }

  func currentUser(token: String) async -> Result<AuthenticatedUser?, AuthenticationError> {
    guard let reply = await perform(requests.session(token: token)) else { return .failure(.network) }
    return responses.session(status: reply.status, data: reply.data)
  }

  func signOut(token: String) async -> AuthenticationError? {
    guard let reply = await perform(requests.signOut(token: token)) else { return .network }
    return responses.acknowledgement(status: reply.status, data: reply.data)
  }

  private struct Reply {
    let status: Int
    let authToken: String?
    let data: Data
  }

  /// `nil` for anything that never produced an HTTP reply — no connection, a
  /// cancelled task, a TLS refusal — all of which read to a person as "the
  /// network did not work".
  private func perform(_ request: AuthenticationRequest?) async -> Reply? {
    guard let request else { return nil }

    var urlRequest = URLRequest(url: request.url)
    urlRequest.httpMethod = request.method
    urlRequest.httpBody = request.body
    for (field, value) in request.headers {
      urlRequest.setValue(value, forHTTPHeaderField: field)
    }

    guard let (data, response) = try? await session.data(for: urlRequest),
      let http = response as? HTTPURLResponse
    else { return nil }

    return Reply(
      status: http.statusCode,
      authToken: http.value(forHTTPHeaderField: "set-auth-token"),
      data: data
    )
  }
}

extension URLSession {
  /// A session that keeps no cookies whatsoever.
  ///
  /// This is not tidiness. Better Auth runs its CSRF origin check only on
  /// requests carrying a `Cookie` header, and a native app sends no `Origin`
  /// for it to accept. Sign-in still answers with `Set-Cookie`; the moment
  /// URLSession stored that and replayed it, every later call would arrive with
  /// a cookie and no origin and be rejected 403. Bearer tokens are the app's
  /// credential — the cookie must be dropped on the floor.
  static let authentication: URLSession = {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.httpCookieStorage = nil
    configuration.httpShouldSetCookies = false
    configuration.httpCookieAcceptPolicy = .never
    configuration.urlCache = nil
    configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
    return URLSession(configuration: configuration)
  }()
}
