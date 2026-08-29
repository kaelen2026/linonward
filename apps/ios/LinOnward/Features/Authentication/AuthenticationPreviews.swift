#if DEBUG
  import Foundation

  /// Preview scaffolding. Excluded from release builds, and deliberately free
  /// of shared state: each preview gets its own store and its own canned
  /// service, so one can never affect another.
  struct InMemoryTokenStore: SessionTokenStore {
    let token: String?

    init(token: String? = nil) {
      self.token = token
    }

    func read() throws -> String? { token }
    func write(_ token: String) throws {}
    func clear() throws {}
  }

  /// An auth service that answers immediately with whatever the preview needs.
  struct StubAuthenticationService: AuthenticationService {
    var codeRequest: AuthenticationError?
    var signInResult: Result<AuthenticatedSession, AuthenticationError> = .failure(.unavailable)
    var googleSignInResult: Result<AuthenticatedSession, AuthenticationError> = .failure(
      .googleUnavailable
    )
    var sessionResult: Result<AuthenticatedUser?, AuthenticationError> = .success(nil)

    func sendVerificationCode(to email: String) async -> AuthenticationError? { codeRequest }

    func signIn(
      email: String,
      code: String
    ) async -> Result<AuthenticatedSession, AuthenticationError> {
      signInResult
    }

    func signIn(
      google identity: GoogleIdentity
    ) async -> Result<AuthenticatedSession, AuthenticationError> {
      googleSignInResult
    }

    func currentUser(token: String) async -> Result<AuthenticatedUser?, AuthenticationError> {
      sessionResult
    }

    func signOut(token: String) async -> AuthenticationError? { nil }
  }

  /// A Google flow that never opens a browser. Previews render the button; they
  /// must not be able to start an OAuth journey from the canvas.
  @MainActor
  struct StubGoogleIdentityProvider: GoogleIdentityProvider {
    var outcome: GoogleSignInOutcome = .declined

    func identity(presentedBy browser: any WebAuthenticationBrowser) async -> GoogleSignInOutcome {
      outcome
    }
  }

  extension AuthenticatedUser {
    static let preview = AuthenticatedUser(id: "1", email: "ada@example.com", name: "Ada Lovelace")
  }
#endif
