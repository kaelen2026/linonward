import Foundation
import Synchronization
import Testing

@testable import LinOnward

@Suite("Google client")
struct GoogleClientTests {
  @Test(
    "refuses a client id Google could not have issued",
    arguments: ["", "   ", "not-a-client", ".apps.googleusercontent.com", "123-abc.example.com"]
  )
  func rejectsUnusableClientID(identifier: String) {
    #expect(GoogleClient(identifier: identifier) == nil)
  }

  @Test("has no client at all when the build supplied none")
  func rejectsMissingClientID() {
    #expect(GoogleClient(identifier: nil) == nil)
  }

  @Test("reaches the app back at the reversed client id, which is all Google will redirect to")
  func derivesCallbackScheme() throws {
    let client = try #require(
      GoogleClient(identifier: " 123456-abcdef.apps.googleusercontent.com ")
    )

    #expect(client.identifier == "123456-abcdef.apps.googleusercontent.com")
    #expect(client.callbackScheme == "com.googleusercontent.apps.123456-abcdef")
    #expect(client.redirectURI == "com.googleusercontent.apps.123456-abcdef:/oauth2redirect")
  }
}

@Suite("Google authorization")
struct GoogleAuthorizationTests {
  // RFC 7636's own test vector, so this asserts the challenge is the SHA-256 an
  // OAuth server will compute and not merely something stable.
  private let challenge = GoogleAuthorizationChallenge(
    verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
    state: "state-token",
    nonce: "nonce-token"
  )
  private let requests = GoogleSignInRequestFactory(
    client: GoogleClient(identifier: "123-abc.apps.googleusercontent.com")!
  )

  @Test("hashes the verifier the way RFC 7636 specifies")
  func derivesCodeChallenge() {
    #expect(challenge.codeChallenge == "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
  }

  @Test("never reuses the secrets that make one sign-in unrepeatable")
  func randomizesEverySecret() {
    let first = GoogleAuthorizationChallenge.random()
    let second = GoogleAuthorizationChallenge.random()

    #expect(first != second)
    #expect(first.verifier != first.nonce && first.verifier != first.state)
    // 32 bytes, base64url, unpadded — the length RFC 7636 sets as its floor.
    #expect(first.verifier.count == 43)
  }

  @Test("asks Google for a code it can only redeem with the verifier it kept")
  func buildsAuthorizationURL() throws {
    let url = try #require(requests.authorizationURL(challenge: challenge))
    let query = try parameters(of: url)

    #expect(url.absoluteString.hasPrefix("https://accounts.google.com/o/oauth2/v2/auth?"))
    #expect(query["response_type"] == "code")
    #expect(query["client_id"] == "123-abc.apps.googleusercontent.com")
    #expect(query["redirect_uri"] == "com.googleusercontent.apps.123-abc:/oauth2redirect")
    #expect(query["code_challenge"] == challenge.codeChallenge)
    #expect(query["code_challenge_method"] == "S256")
    #expect(query["state"] == challenge.state)
    #expect(query["nonce"] == challenge.nonce)
    #expect(query["scope"] == "openid email profile")
    #expect(query["code_verifier"] == nil, "the verifier is the half that must not travel yet")
  }

  @Test("offers the account chooser, so signing out is not a one-way door")
  func promptsForAccount() throws {
    let url = try #require(requests.authorizationURL(challenge: challenge))
    let query = try parameters(of: url)

    #expect(query["prompt"] == "select_account")
  }

  @Test("redeems the code as a public client: the verifier, and no secret")
  func buildsTokenExchange() throws {
    let request = try #require(requests.tokenExchange(code: "auth-code", challenge: challenge))
    let fields = try form(of: request)

    #expect(request.method == "POST")
    #expect(request.url.absoluteString == "https://oauth2.googleapis.com/token")
    #expect(request.headers["Content-Type"] == "application/x-www-form-urlencoded")
    #expect(fields["grant_type"] == "authorization_code")
    #expect(fields["code"] == "auth-code")
    #expect(fields["code_verifier"] == challenge.verifier)
    #expect(fields["client_id"] == "123-abc.apps.googleusercontent.com")
    #expect(
      fields["redirect_uri"] == "com.googleusercontent.apps.123-abc:/oauth2redirect",
      "Google matches the redirect against the authorization request"
    )
    #expect(fields["client_secret"] == nil, "a secret shipped in an app is not a secret")
  }

  @Test("escapes a code whose own characters would otherwise end the field")
  func escapesFormBody() throws {
    let request = try #require(requests.tokenExchange(code: "4/0a+b=c&d", challenge: challenge))
    let body = String(decoding: try #require(request.body), as: UTF8.self)
    let fields = try form(of: request)

    #expect(body.contains("code=4%2F0a%2Bb%3Dc%26d"))
    #expect(fields["code"] == "4/0a+b=c&d")
  }

  @Test("reads the authorization code out of the redirect")
  func readsCallbackCode() {
    let callback = URL(
      string: "com.googleusercontent.apps.123-abc:/oauth2redirect?state=state-token&code=abc123"
    )!

    #expect(requests.outcome(callback: callback, challenge: challenge) == .code("abc123"))
  }

  @Test("treats a refusal as a decision rather than a failure")
  func readsDeclinedCallback() {
    let callback = URL(
      string: "com.googleusercontent.apps.123-abc:/oauth2redirect?state=state-token&error=access_denied"
    )!

    #expect(requests.outcome(callback: callback, challenge: challenge) == .declined)
  }

  @Test(
    "refuses a callback that does not answer this request",
    arguments: [
      // A code under someone else's state is the injection the parameter exists
      // to stop, so it must not be read even though it looks complete.
      "com.googleusercontent.apps.123-abc:/oauth2redirect?state=other&code=abc123",
      "com.googleusercontent.apps.123-abc:/oauth2redirect?code=abc123",
      "com.googleusercontent.apps.123-abc:/oauth2redirect?state=state-token",
      "com.googleusercontent.apps.123-abc:/oauth2redirect?state=state-token&code=",
      "com.googleusercontent.apps.123-abc:/oauth2redirect?state=state-token&error=server_error",
    ]
  )
  func refusesUnusableCallback(callback: String) {
    #expect(requests.outcome(callback: URL(string: callback)!, challenge: challenge) == .failed)
  }

  @Test("keeps only the id token out of Google's reply")
  func readsIdentityToken() {
    let data = Data(#"{"access_token":"at","id_token":"header.payload.signature"}"#.utf8)

    #expect(requests.identityToken(status: 200, data: data) == "header.payload.signature")
  }

  @Test(
    "has nothing to hand the API when the exchange did not produce a token",
    arguments: [
      (200, #"{"access_token":"at"}"#),
      (200, #"{"id_token":""}"#),
      (200, "<html>"),
      (400, #"{"error":"invalid_grant","id_token":"h.p.s"}"#),
    ]
  )
  func rejectsUnusableTokenReply(status: Int, body: String) {
    #expect(requests.identityToken(status: status, data: Data(body.utf8)) == nil)
  }

  private func parameters(of url: URL) throws -> [String: String] {
    let items = try #require(URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems)
    return Dictionary(uniqueKeysWithValues: items.map { ($0.name, $0.value ?? "") })
  }

  /// Reads a form body back through the same rules it was written with.
  private func form(of request: AuthenticationRequest) throws -> [String: String] {
    let body = String(decoding: try #require(request.body), as: UTF8.self)
    let pairs = body.split(separator: "&").map { field -> (String, String) in
      let halves = field.split(separator: "=", maxSplits: 1)
      let name = String(halves[0]).removingPercentEncoding ?? ""
      let value = halves.count > 1 ? String(halves[1]).removingPercentEncoding ?? "" : ""
      return (name, value)
    }
    return Dictionary(uniqueKeysWithValues: pairs)
  }
}

@Suite("Google sign-in against the API")
struct GoogleAPISignInTests {
  private let identity = GoogleIdentity(idToken: "header.payload.signature", nonce: "nonce-token")

  @Test("hands the id token to the branch of sign-in that answers with a session")
  func buildsSocialSignInRequest() throws {
    let factory = try #require(AuthenticationRequestFactory(baseURL: "http://localhost:3001"))
    let request = try #require(factory.signIn(google: identity))

    #expect(request.method == "POST")
    #expect(request.url.absoluteString == "http://localhost:3001/api/auth/sign-in/social")
    #expect(request.headers["Content-Type"] == "application/json")
    #expect(request.headers["Authorization"] == nil, "there is no session to present yet")
  }

  @Test("names the provider and repeats the nonce the API has to check")
  func sendsProviderAndNonce() throws {
    let factory = try #require(AuthenticationRequestFactory(baseURL: "http://localhost:3001"))
    let request = try #require(factory.signIn(google: identity))
    let body = try JSONSerialization.jsonObject(with: try #require(request.body))

    let fields = try #require(body as? [String: Any])
    #expect(fields["provider"] as? String == "google")
    let token = try #require(fields["idToken"] as? [String: Any])
    #expect(token["token"] as? String == "header.payload.signature")
    #expect(token["nonce"] as? String == "nonce-token")
  }

  @Test(
    "says Google is unavailable for the failures only the API can see",
    arguments: [
      "PROVIDER_NOT_FOUND", "ID_TOKEN_NOT_SUPPORTED", "INVALID_TOKEN", "FAILED_TO_GET_USER_INFO",
    ]
  )
  func mapsSocialSignInFailures(code: String) {
    let data = Data(#"{"code":"\#(code)","message":"whatever"}"#.utf8)

    #expect(
      AuthenticationResponseDecoder().acknowledgement(status: 401, data: data)
        == .googleUnavailable
    )
  }
}

@Suite("Google sign-in flow")
@MainActor
struct GoogleSignInFlowTests {
  private let session = AuthenticatedSession(
    user: AuthenticatedUser(id: "1", email: "ada@example.com", name: "Ada"),
    token: "session-token"
  )

  @Test("keeps the session token from a Google sign-in, exactly as it keeps an emailed one")
  func storesTokenOnSuccess() async {
    let tokens = RecordingTokenStore()
    let model = await signedOutModel(
      service: StubAuthenticationService(googleSignInResult: .success(session)),
      outcome: .identity(GoogleIdentity(idToken: "h.p.s", nonce: "n")),
      tokens: tokens
    )

    await model.signInWithGoogle(presentedBy: StubWebAuthenticationBrowser())

    #expect(model.state.step == .signedIn(session.user))
    #expect(
      tokens.written == "session-token",
      "an unstored token signs the person out again on the next launch"
    )
  }

  @Test("says nothing at all when the person closes the browser")
  func staysQuietOnDecline() async {
    let model = await signedOutModel(outcome: .declined)

    await model.signInWithGoogle(presentedBy: StubWebAuthenticationBrowser())

    #expect(model.state.error == nil, "backing out is a decision, not a failure to report")
    #expect(!model.state.isBusy, "and the spinner still has to stop")
    #expect(model.state.step == .email, "the screen they backed out to is the one they left")
  }

  @Test("shows why when Google itself could not be completed")
  func reportsProviderFailure() async {
    let model = await signedOutModel(outcome: .failed(.googleUnavailable))

    await model.signInWithGoogle(presentedBy: StubWebAuthenticationBrowser())

    #expect(model.state.error == .googleUnavailable)
    #expect(!model.state.isBusy)
  }

  /// A model on the sign-in screen, reached the way the app reaches it — a
  /// launch that finds no stored session. Starting from a freshly built state
  /// would leave it on `.restoring`, which is not a screen the Google button
  /// exists on.
  private func signedOutModel(
    service: StubAuthenticationService = StubAuthenticationService(),
    outcome: GoogleSignInOutcome,
    tokens: RecordingTokenStore = RecordingTokenStore()
  ) async -> AuthenticationModel {
    let model = AuthenticationModel(
      service: service,
      google: StubGoogleIdentityProvider(outcome: outcome),
      tokens: tokens
    )
    await model.restore()
    return model
  }

  @Test("offers Google only when the build carries a client for it")
  func hidesGoogleWithoutAClient() {
    let withoutGoogle = AuthenticationModel(
      service: StubAuthenticationService(),
      tokens: RecordingTokenStore()
    )
    let withGoogle = AuthenticationModel(
      service: StubAuthenticationService(),
      google: StubGoogleIdentityProvider(),
      tokens: RecordingTokenStore()
    )

    #expect(!withoutGoogle.isGoogleAvailable)
    #expect(withGoogle.isGoogleAvailable)
  }

  @Test("reads the client id the build baked into Info.plist")
  func readsGoogleClientFromConfiguration() {
    let configured = APIConfiguration(
      origin: "http://localhost:3001",
      googleClientID: "123-abc.apps.googleusercontent.com"
    )
    // What a build that was never given a client id actually contains: the
    // xcconfig variable expands to an empty string, not to a missing key.
    let unconfigured = APIConfiguration(origin: "http://localhost:3001", googleClientID: "")

    #expect(configured.googleClient?.identifier == "123-abc.apps.googleusercontent.com")
    #expect(unconfigured.googleClient == nil)
  }
}

/// A browser that is never opened. Every test above decides the outcome at the
/// provider, so reaching this would mean the flow tried to present something.
@MainActor
private struct StubWebAuthenticationBrowser: WebAuthenticationBrowser {
  func authenticate(
    using url: URL,
    callbackScheme: String
  ) async -> Result<URL, WebAuthenticationFailure> {
    .failure(.unavailable)
  }
}

/// Remembers what the flow stored, so "signed in" can be told apart from
/// "signed in until the app is relaunched".
///
/// Locked rather than isolated to the main actor: `SessionTokenStore` is
/// `Sendable` and its requirements are nonisolated, which a `@MainActor`
/// conformance cannot satisfy.
private final class RecordingTokenStore: SessionTokenStore {
  private let token = Mutex<String?>(nil)

  var written: String? { token.withLock { $0 } }

  func read() -> String? { token.withLock { $0 } }
  func write(_ value: String) { token.withLock { $0 = value } }
  func clear() { token.withLock { $0 = nil } }
}
