import Foundation

/// A Google identity, ready to be traded with the API for a session.
struct GoogleIdentity: Equatable, Sendable {
  /// Google's signed claim about who this is. The app does not verify it and
  /// could not usefully try — the API checks the signature, the issuer, the
  /// audience, and the nonce below.
  let idToken: String
  /// Sent alongside the token so the API can confirm Google put it there.
  let nonce: String
}

/// How the Google half of sign-in ended.
enum GoogleSignInOutcome: Equatable, Sendable {
  case identity(GoogleIdentity)
  /// Closed the browser or refused consent. Not a failure, and not something to
  /// put an error on screen for.
  case declined
  case failed(AuthenticationError)
}

/// Everything between tapping the Google button and holding an id token.
///
/// `@MainActor` because the browser it drives is presented from the UI, and the
/// whole flow is one uninterrupted response to a tap.
@MainActor
protocol GoogleIdentityProvider {
  func identity(presentedBy browser: any WebAuthenticationBrowser) async -> GoogleSignInOutcome
}

/// Authorization code with PKCE, as RFC 8252 asks a native app to do it.
///
/// The app talks to Google directly rather than letting the API run a redirect,
/// because the API's redirect flow can only end at an `https` address and a
/// phone is not reachable at one. What crosses to `apps/api` afterwards is the
/// id token, on `POST /api/auth/sign-in/social`.
@MainActor
struct LiveGoogleIdentityProvider: GoogleIdentityProvider {
  private let requests: GoogleSignInRequestFactory
  private let session: URLSession

  init(client: GoogleClient, session: URLSession = .authentication) {
    requests = GoogleSignInRequestFactory(client: client)
    self.session = session
  }

  func identity(presentedBy browser: any WebAuthenticationBrowser) async -> GoogleSignInOutcome {
    // New for every attempt. Reusing a verifier or a nonce across two sign-ins
    // is what makes the second one replayable.
    let challenge = GoogleAuthorizationChallenge.random()
    guard let authorization = requests.authorizationURL(challenge: challenge) else {
      return .failed(.googleUnavailable)
    }

    let callback: URL
    switch await browser.authenticate(
      using: authorization,
      callbackScheme: requests.client.callbackScheme
    ) {
    case .success(let url):
      callback = url
    case .failure(.declined):
      return .declined
    case .failure(.unavailable):
      return .failed(.googleUnavailable)
    }

    switch requests.outcome(callback: callback, challenge: challenge) {
    case .declined:
      return .declined
    case .failed:
      return .failed(.googleUnavailable)
    case .code(let code):
      return await exchange(code: code, challenge: challenge)
    }
  }

  private func exchange(
    code: String,
    challenge: GoogleAuthorizationChallenge
  ) async -> GoogleSignInOutcome {
    let request = requests.tokenExchange(code: code, challenge: challenge)
    guard let reply = await session.reply(to: request) else { return .failed(.network) }
    guard let idToken = requests.identityToken(status: reply.status, data: reply.data) else {
      return .failed(.googleUnavailable)
    }
    return .identity(GoogleIdentity(idToken: idToken, nonce: challenge.nonce))
  }
}
