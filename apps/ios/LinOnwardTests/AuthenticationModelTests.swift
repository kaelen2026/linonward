import Testing

@testable import LinOnward

@Suite("Authentication model coordination")
@MainActor
struct AuthenticationModelTests {
  @Test("ignores another code request while the first one is in flight")
  func preventsDuplicateCodeRequests() async {
    let service = SuspendingAuthenticationService()
    let model = AuthenticationModel(service: service, tokens: InMemoryTokenStore())
    await model.restore()
    model.email = "ada@example.com"

    let first = Task { await model.sendVerificationCode() }
    await service.waitUntilCodeRequestStarts()
    let second = Task { await model.sendVerificationCode() }
    await first.value
    await second.value

    #expect(await service.codeRequestCount == 1)
  }
}

private actor SuspendingAuthenticationService: AuthenticationService {
  private(set) var codeRequestCount = 0

  func sendVerificationCode(to email: String) async -> AuthenticationError? {
    codeRequestCount += 1
    try? await Task.sleep(for: .milliseconds(100))
    return nil
  }

  func waitUntilCodeRequestStarts() async {
    while codeRequestCount == 0 { await Task.yield() }
  }

  func signIn(
    email: String,
    code: String
  ) async -> Result<AuthenticatedSession, AuthenticationError> {
    .failure(.unavailable)
  }

  func signIn(
    google identity: GoogleIdentity
  ) async -> Result<AuthenticatedSession, AuthenticationError> {
    .failure(.unavailable)
  }

  func currentUser(token: String) async -> Result<AuthenticatedUser?, AuthenticationError> {
    .success(nil)
  }

  func signOut(token: String) async -> AuthenticationError? { nil }
}
