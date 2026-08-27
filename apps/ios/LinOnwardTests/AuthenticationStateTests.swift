import Testing

@testable import LinOnward

@Suite("Sign-in flow")
struct AuthenticationStateTests {
  private let ada = AuthenticatedUser(id: "1", email: "ada@example.com", name: "Ada")

  @Test("starts by checking for a stored session, not by asking for an email")
  func startsRestoring() {
    #expect(AuthenticationState().step == .restoring)
  }

  @Test(
    "holds out for an address that could receive mail",
    arguments: [
      ("", false),
      ("ada", false),
      ("ada@", false),
      ("@example.com", false),
      ("ada@example", false),
      ("ada@@example.com", false),
      ("ada@example.com", true),
      ("  ada@example.com  ", true),
    ]
  )
  func validatesEmailBeforeSending(email: String, expected: Bool) {
    var state = AuthenticationState()
    state.email = email

    #expect(state.canSendCode == expected)
  }

  @Test("refuses a second submission while one is in flight")
  func blocksConcurrentSubmissions() {
    var state = AuthenticationState()
    state.email = "ada@example.com"
    state.code = "123456"
    #expect(state.canSendCode)
    #expect(state.canVerifyCode)

    state.beginRequest()

    #expect(!state.canSendCode)
    #expect(!state.canVerifyCode)
    #expect(state.isBusy)
  }

  @Test(
    "waits for a complete numeric code",
    arguments: [("", false), ("12345", false), ("1234567", false), ("12345a", false), ("123456", true)]
  )
  func validatesCodeBeforeVerifying(code: String, expected: Bool) {
    var state = AuthenticationState()
    state.code = code

    #expect(state.canVerifyCode == expected)
  }

  @Test("keeps the address it actually sent to, without the keyboard's whitespace")
  func normalizesEmailOnSend() {
    var state = AuthenticationState()
    state.email = "  ada@example.com \n"
    state.beginRequest()

    state.codeSent()

    #expect(state.email == "ada@example.com")
    #expect(state.step == .code)
    #expect(!state.isBusy)
  }

  @Test("stops the spinner and shows why, without moving on")
  func reportsRecoverableFailure() {
    var state = AuthenticationState()
    state.email = "ada@example.com"
    state.beginRequest()
    state.codeSent()
    state.code = "111111"
    state.beginRequest()

    state.failed(.invalidCode)

    #expect(!state.isBusy)
    #expect(state.error == .invalidCode)
    #expect(state.step == .code, "a mistyped code is worth retyping on the same screen")
    #expect(state.code == "111111", "so the person can correct a digit instead of starting over")
  }

  @Test(
    "sends the person back for a fresh code when retyping cannot succeed",
    arguments: [AuthenticationError.expiredCode, .tooManyAttempts]
  )
  func returnsToEmailWhenCodeIsDead(failure: AuthenticationError) {
    var state = AuthenticationState()
    state.email = "ada@example.com"
    state.beginRequest()
    state.codeSent()
    state.code = "111111"
    state.beginRequest()

    state.failed(failure)

    #expect(state.step == .email)
    #expect(state.code.isEmpty)
    #expect(state.error == failure, "the reason has to survive the trip back")
    #expect(state.email == "ada@example.com", "retyping the address is pure friction")
  }

  @Test("clears the error when the next attempt begins")
  func clearsErrorOnRetry() {
    var state = AuthenticationState()
    state.failed(.network)
    #expect(state.error == .network)

    state.beginRequest()

    #expect(state.error == nil)
  }

  @Test("leaves no code behind after signing in")
  func clearsCodeOnSuccess() {
    var state = AuthenticationState()
    state.code = "123456"
    state.beginRequest()

    state.signedIn(ada)

    #expect(state.step == .signedIn(ada))
    #expect(state.code.isEmpty)
    #expect(state.error == nil)
    #expect(!state.isBusy)
  }

  @Test("keeps the address after signing out, so getting back in is one tap")
  func keepsEmailAfterSignOut() {
    var state = AuthenticationState()
    state.email = "ada@example.com"
    state.beginRequest()
    state.signedIn(ada)

    state.signedOut()

    #expect(state.step == .email)
    #expect(state.email == "ada@example.com")
    #expect(state.error == nil)
  }

  @Test("treats changing address as a step back, not a failure")
  func editEmailIsNotAFailure() {
    var state = AuthenticationState()
    state.email = "ada@example.com"
    state.beginRequest()
    state.codeSent()
    state.code = "123456"
    state.failed(.invalidCode)

    state.editEmail()

    #expect(state.step == .email)
    #expect(state.code.isEmpty)
    #expect(state.error == nil, "a stale error under the email field reads as a new one")
  }
}
