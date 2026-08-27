import CryptoKit
import Foundation

/// The Google OAuth client this build signs in with.
///
/// A native client of its own, not the one `apps/web` uses: Google refuses to
/// redirect a *web* client to a custom URL scheme, which is the only kind of
/// address an app can be reached at. The two live in the same Google project,
/// so the person behind them is the same account either way — see
/// `googleProvider` in `apps/api/src/modules/auth/auth.ts` for the other half.
struct GoogleClient: Equatable, Sendable {
  /// Every client id Google issues ends this way, and the half in front of it
  /// is what the redirect scheme is built from.
  private static let suffix = ".apps.googleusercontent.com"

  let identifier: String

  /// The reversed client id: `123-abc.apps.googleusercontent.com` is reachable
  /// at `com.googleusercontent.apps.123-abc`. Google will only redirect a
  /// native client here, and it is the scheme the browser session watches for.
  let callbackScheme: String

  /// `nil` when the build carries no client id, or carries one Google could
  /// never have issued. The sign-in screen then offers email only, rather than
  /// a button that opens a browser onto an error page.
  init?(identifier: String?) {
    let trimmed = identifier?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    guard trimmed.hasSuffix(Self.suffix), trimmed.count > Self.suffix.count else { return nil }
    self.identifier = trimmed
    callbackScheme = "com.googleusercontent.apps.\(trimmed.dropLast(Self.suffix.count))"
  }

  /// Google accepts any path under the reversed-client-id scheme and matches
  /// the whole string, so this has to be identical in both requests below.
  var redirectURI: String { "\(callbackScheme):/oauth2redirect" }
}

/// The one-time secrets that tie one authorization request to its token
/// exchange, and both to the identity that comes back.
///
/// A phone can keep no client secret — anyone can extract it from the app — so
/// these three values are the entire proof that the exchange is legitimate.
struct GoogleAuthorizationChallenge: Equatable, Sendable {
  /// Held back until the exchange, then presented: proves the code is being
  /// redeemed by whoever asked for it (RFC 7636).
  let verifier: String
  /// Echoed by Google on the redirect: proves the callback answers *this*
  /// request and not one someone else started.
  let state: String
  /// Embedded in the id token by Google and checked by the API: proves the
  /// token was minted for this sign-in rather than captured from another.
  let nonce: String

  static func random() -> Self {
    Self(verifier: randomToken(), state: randomToken(), nonce: randomToken())
  }

  /// The verifier as Google is asked to remember it.
  var codeChallenge: String {
    Data(SHA256.hash(data: Data(verifier.utf8))).base64URLEncodedString()
  }

  /// 32 bytes from the system's cryptographic generator, which base64url-encode
  /// to the 43 characters RFC 7636 sets as the floor for a verifier.
  private static func randomToken() -> String {
    var bytes = Data(count: 32)
    for index in bytes.indices {
      bytes[index] = UInt8.random(in: UInt8.min...UInt8.max)
    }
    return bytes.base64URLEncodedString()
  }
}

/// What Google's redirect turned out to be.
enum GoogleAuthorizationOutcome: Equatable, Sendable {
  case code(String)
  /// The person refused consent or closed the browser.
  case declined
  /// A reply that cannot be trusted, or cannot be used.
  case failed
}

/// Builds the two requests the Google half of sign-in makes, and reads what
/// comes back.
///
/// No URLSession and no browser in here, for the same reason
/// `AuthenticationRequestFactory` has none: the shape of an OAuth request is
/// exactly the part worth asserting in a test, and it needs no network to check.
struct GoogleSignInRequestFactory: Sendable {
  let client: GoogleClient

  init(client: GoogleClient) {
    self.client = client
  }

  func authorizationURL(challenge: GoogleAuthorizationChallenge) -> URL? {
    var components = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")
    components?.queryItems = [
      URLQueryItem(name: "client_id", value: client.identifier),
      URLQueryItem(name: "redirect_uri", value: client.redirectURI),
      URLQueryItem(name: "response_type", value: "code"),
      // `openid` and `email` are what the API needs to recognise the account;
      // `profile` is what leaves the home screen a name to greet.
      URLQueryItem(name: "scope", value: "openid email profile"),
      URLQueryItem(name: "code_challenge", value: challenge.codeChallenge),
      URLQueryItem(name: "code_challenge_method", value: "S256"),
      URLQueryItem(name: "state", value: challenge.state),
      URLQueryItem(name: "nonce", value: challenge.nonce),
      // Signing out and back in has to be able to land on a different account,
      // which a silent re-authorization would never allow.
      URLQueryItem(name: "prompt", value: "select_account"),
    ]
    return components?.url
  }

  /// Reads the redirect Google sent the app back to.
  func outcome(
    callback: URL,
    challenge: GoogleAuthorizationChallenge
  ) -> GoogleAuthorizationOutcome {
    let items = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems ?? []
    func value(_ name: String) -> String? { items.first { $0.name == name }?.value }

    // Checked before anything else is read: a callback that does not answer
    // this request is not evidence of anything, including of its own error.
    guard value("state") == challenge.state else { return .failed }
    if let error = value("error") {
      return error == "access_denied" ? .declined : .failed
    }
    guard let code = value("code"), !code.isEmpty else { return .failed }
    return .code(code)
  }

  /// The public-client half of the flow: no secret exists on a phone, so the
  /// verifier is the only thing proving this exchange belongs to the
  /// authorization that produced the code.
  func tokenExchange(
    code: String,
    challenge: GoogleAuthorizationChallenge
  ) -> AuthenticationRequest? {
    guard let url = URL(string: "https://oauth2.googleapis.com/token") else { return nil }
    return AuthenticationRequest(
      url: url,
      method: "POST",
      headers: [
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      ],
      body: formEncoded([
        ("client_id", client.identifier),
        ("code", code),
        ("code_verifier", challenge.verifier),
        ("grant_type", "authorization_code"),
        ("redirect_uri", client.redirectURI),
      ])
    )
  }

  /// The id token out of Google's reply, or `nil` for anything unusable.
  ///
  /// The access token beside it is deliberately dropped: the app calls no
  /// Google API on the person's behalf, and a credential nobody needs is a
  /// credential worth not storing.
  func identityToken(status: Int, data: Data) -> String? {
    guard (200..<300).contains(status),
      let payload = try? JSONDecoder().decode(GoogleTokenPayload.self, from: data),
      !payload.idToken.isEmpty
    else { return nil }
    return payload.idToken
  }
}

/// `POST https://oauth2.googleapis.com/token`.
private struct GoogleTokenPayload: Decodable {
  let idToken: String

  private enum CodingKeys: String, CodingKey {
    case idToken = "id_token"
  }
}

/// `application/x-www-form-urlencoded`, spelled out rather than assembled from
/// `URLComponents`.
///
/// The percent-encoding a *query string* is allowed to skip — `+`, `/`, `=` —
/// is exactly what a form body may not leave alone, and a Google authorization
/// code contains those characters. Encoding everything outside the unreserved
/// set is the rule the spec actually states.
private func formEncoded(_ fields: [(String, String)]) -> Data {
  let unreserved = CharacterSet(
    charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
  )
  let escape = { (part: String) in
    part.addingPercentEncoding(withAllowedCharacters: unreserved) ?? part
  }
  let pairs = fields.map { name, value in "\(escape(name))=\(escape(value))" }
  return Data(pairs.joined(separator: "&").utf8)
}

extension Data {
  /// base64url without padding — how every OAuth parameter here is defined.
  fileprivate func base64URLEncodedString() -> String {
    base64EncodedString()
      .replacingOccurrences(of: "+", with: "-")
      .replacingOccurrences(of: "/", with: "_")
      .replacingOccurrences(of: "=", with: "")
  }
}
