import Foundation
import Testing

@testable import LinOnward

@Suite("Auth request building")
struct AuthenticationRequestFactoryTests {
  @Test("refuses an origin the app could never reach")
  func rejectsUnusableOrigin() {
    #expect(AuthenticationRequestFactory(baseURL: "") == nil)
    #expect(AuthenticationRequestFactory(baseURL: "   ") == nil)
    #expect(AuthenticationRequestFactory(baseURL: "localhost:3001") == nil)
  }

  @Test("keeps a path prefix on the configured origin")
  func preservesBasePath() throws {
    let factory = try #require(AuthenticationRequestFactory(baseURL: "https://example.com/gateway"))
    let request = try #require(factory.session(token: "t"))

    #expect(request.url.absoluteString == "https://example.com/gateway/api/auth/get-session")
  }

  @Test("joins with exactly one slash when the origin has a trailing one")
  func normalizesTrailingSlash() throws {
    let factory = try #require(AuthenticationRequestFactory(baseURL: "http://localhost:3001/"))
    let request = try #require(factory.session(token: "t"))

    #expect(request.url.absoluteString == "http://localhost:3001/api/auth/get-session")
  }

  @Test("asks for a sign-in code rather than a verification one")
  func sendsSignInCodeType() throws {
    let factory = try #require(AuthenticationRequestFactory(baseURL: "http://localhost:3001"))
    let request = try #require(factory.sendVerificationCode(email: "ada@example.com"))

    #expect(request.method == "POST")
    #expect(request.url.absoluteString.hasSuffix("/api/auth/email-otp/send-verification-otp"))
    #expect(try body(of: request) == ["email": "ada@example.com", "type": "sign-in"])
  }

  @Test("sends no credential while requesting a code")
  func sendsNoTokenBeforeSignIn() throws {
    let factory = try #require(AuthenticationRequestFactory(baseURL: "http://localhost:3001"))

    let send = try #require(factory.sendVerificationCode(email: "ada@example.com"))
    let signIn = try #require(factory.signIn(email: "ada@example.com", code: "123456"))

    #expect(send.headers["Authorization"] == nil)
    #expect(signIn.headers["Authorization"] == nil)
  }

  @Test("presents the session token as a bearer credential")
  func authorizesWithBearerToken() throws {
    let factory = try #require(AuthenticationRequestFactory(baseURL: "http://localhost:3001"))

    let session = try #require(factory.session(token: "abc.def"))
    let signOut = try #require(factory.signOut(token: "abc.def"))

    #expect(session.headers["Authorization"] == "Bearer abc.def")
    #expect(signOut.headers["Authorization"] == "Bearer abc.def")
    #expect(signOut.method == "POST")
  }

  private func body(of request: AuthenticationRequest) throws -> [String: String] {
    let data = try #require(request.body)
    return try JSONDecoder().decode([String: String].self, from: data)
  }
}

@Suite("Auth response decoding")
struct AuthenticationResponseDecoderTests {
  private let decoder = AuthenticationResponseDecoder()

  @Test("prefers the set-auth-token header over the token in the body")
  func prefersHeaderToken() throws {
    let data = Data(#"{"token":"body-token","user":{"id":"1","email":"a@b.c","name":"Ada"}}"#.utf8)

    let session = try decoder.signIn(status: 200, authToken: "header-token", data: data).get()

    #expect(session.token == "header-token")
    #expect(session.user == AuthenticatedUser(id: "1", email: "a@b.c", name: "Ada"))
  }

  @Test("falls back to the body token when the header is stripped in transit")
  func fallsBackToBodyToken() throws {
    let data = Data(#"{"token":"body-token","user":{"id":"1","email":"a@b.c","name":"Ada"}}"#.utf8)

    #expect(try decoder.signIn(status: 200, authToken: nil, data: data).get().token == "body-token")
    #expect(try decoder.signIn(status: 200, authToken: "  ", data: data).get().token == "body-token")
  }

  @Test("treats a sign-in that carries no token at all as unusable")
  func requiresSomeToken() {
    let data = Data(#"{"user":{"id":"1","email":"a@b.c","name":"Ada"}}"#.utf8)

    #expect(decoder.signIn(status: 200, authToken: nil, data: data) == .failure(.unavailable))
  }

  @Test("names the account after its email when the backend has no name for it")
  func fallsBackToEmailForName() throws {
    let data = Data(#"{"token":"t","user":{"id":"1","email":"a@b.c","name":""}}"#.utf8)

    #expect(try decoder.signIn(status: 200, authToken: nil, data: data).get().user.name == "a@b.c")
  }

  @Test("reads a null session as signed out rather than as a failure")
  func nullSessionIsSignedOut() throws {
    #expect(try decoder.session(status: 200, data: Data("null".utf8)).get() == nil)
    #expect(try decoder.session(status: 200, data: Data()).get() == nil)
  }

  @Test("reads a populated session as the signed-in user")
  func decodesSessionUser() throws {
    let data = Data(#"{"user":{"id":"1","email":"a@b.c","name":"Ada"}}"#.utf8)

    #expect(try decoder.session(status: 200, data: data).get()?.email == "a@b.c")
  }

  @Test("rejects a 200 whose body is not what the contract promises")
  func rejectsMalformedSuccess() {
    let data = Data(#"{"user":{"id":"1"}}"#.utf8)

    #expect(decoder.session(status: 200, data: data) == .failure(.unavailable))
  }

  @Test(
    "distinguishes the OTP failures a person can act on",
    arguments: [
      ("INVALID_OTP", 400, AuthenticationError.invalidCode),
      ("OTP_EXPIRED", 400, .expiredCode),
      ("TOO_MANY_ATTEMPTS", 403, .tooManyAttempts),
    ]
  )
  func mapsPluginErrorCodes(code: String, status: Int, expected: AuthenticationError) {
    let data = Data(#"{"code":"\#(code)","message":"whatever"}"#.utf8)

    #expect(decoder.acknowledgement(status: status, data: data) == expected)
  }

  @Test("accepts a 2xx acknowledgement without a body")
  func acceptsEmptyAcknowledgement() {
    #expect(decoder.acknowledgement(status: 200, data: Data()) == nil)
  }

  @Test("treats a rate-limited request like a burnt code")
  func mapsRateLimit() {
    #expect(decoder.acknowledgement(status: 429, data: Data()) == .tooManyAttempts)
  }

  @Test("falls back to unavailable for an error it cannot interpret")
  func mapsUnknownFailure() {
    #expect(decoder.acknowledgement(status: 500, data: Data("<html>".utf8)) == .unavailable)
  }

  @Test("gives every failure its own message to show")
  func mapsEveryCaseToADistinctKey() {
    let cases: [AuthenticationError] = [
      .notConfigured, .network, .invalidCode, .expiredCode, .tooManyAttempts, .googleUnavailable,
      .unavailable,
    ]
    let keys = cases.map(\.messageKey)

    #expect(Set(keys).count == cases.count)
    #expect(keys.allSatisfy { $0.hasPrefix("auth.error.") })
  }

  @Test("sends somebody back for a new code only when retyping cannot help")
  func classifiesRecoverability() {
    #expect(AuthenticationError.expiredCode.requiresNewCode)
    #expect(AuthenticationError.tooManyAttempts.requiresNewCode)
    #expect(!AuthenticationError.invalidCode.requiresNewCode)
    #expect(!AuthenticationError.network.requiresNewCode)
  }
}
