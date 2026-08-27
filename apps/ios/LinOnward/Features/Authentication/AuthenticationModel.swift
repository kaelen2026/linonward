import Foundation
import Observation

/// Drives the sign-in flow: owns the state, calls the service, and decides what
/// happens to the stored token.
///
/// Thin on purpose. Every rule about which screen comes next lives in
/// `AuthenticationState`, which is testable without a simulator; what is left
/// here is the wiring between that value, the network, and the Keychain.
@MainActor
@Observable
final class AuthenticationModel {
  private(set) var state = AuthenticationState()

  /// `nil` when the build carries no API origin. Every action then reports
  /// `.notConfigured` rather than failing silently or crashing on launch.
  private let service: (any AuthenticationService)?
  private let tokens: any SessionTokenStore

  init(service: (any AuthenticationService)?, tokens: any SessionTokenStore) {
    self.service = service
    self.tokens = tokens
  }

  /// Reads the API origin from the build and assembles the live stack.
  convenience init(configuration: APIConfiguration = .fromBundle()) {
    let service = configuration.requests.map { LiveAuthenticationService(requests: $0) }
    self.init(service: service, tokens: KeychainSessionTokenStore())
  }

  var email: String {
    get { state.email }
    set { state.email = newValue }
  }

  var code: String {
    get { state.code }
    set { state.code = newValue }
  }

  /// Turns a stored token back into a session, on launch.
  func restore() async {
    guard let service else {
      // Order matters: `signedOut` clears the error, so the reason has to be
      // set after the step, not before it.
      state.signedOut()
      state.failed(.notConfigured)
      return
    }
    guard let token = tokens.read() else {
      state.signedOut()
      return
    }

    switch await service.currentUser(token: token) {
    case .success(let user?):
      state.signedIn(user)
    case .success(nil):
      // The API is the authority and it says this token is spent.
      tokens.clear()
      state.signedOut()
    case .failure(let failure):
      // Being offline is not being signed out. The token stays put so the next
      // launch on a working network restores the session instead of demanding
      // a new code.
      state.signedOut()
      state.failed(failure)
    }
  }

  func sendVerificationCode() async {
    guard let service else {
      state.failed(.notConfigured)
      return
    }
    state.beginRequest()

    if let failure = await service.sendVerificationCode(to: state.trimmedEmail) {
      state.failed(failure)
      return
    }
    state.codeSent()
  }

  func verifyCode() async {
    guard let service else {
      state.failed(.notConfigured)
      return
    }
    state.beginRequest()

    switch await service.signIn(email: state.email, code: state.code) {
    case .success(let session):
      tokens.write(session.token)
      state.signedIn(session.user)
    case .failure(let failure):
      state.failed(failure)
    }
  }

  func editEmail() {
    state.editEmail()
  }

  /// Signs out locally first, then tells the API.
  ///
  /// The order matters: nobody should stay signed in on a screen because the
  /// network is slow, and a revocation that fails leaves a token the app has
  /// already forgotten — it expires on its own.
  func signOut() async {
    let token = tokens.read()
    tokens.clear()
    state.signedOut()

    if let service, let token {
      _ = await service.signOut(token: token)
    }
  }
}

#if DEBUG
  /// Preview factories. They live beside the model rather than in
  /// `AuthenticationPreviews.swift` because `state` is `private(set)`, and they
  /// reach each screen through the real transitions — a preview that set the
  /// step directly could show a combination the app can never produce.
  extension AuthenticationModel {
    static func previewAwaitingEmail() -> AuthenticationModel {
      let model = AuthenticationModel(
        service: StubAuthenticationService(),
        tokens: InMemoryTokenStore()
      )
      model.state.signedOut()
      model.email = "ada@example.com"
      return model
    }

    static func previewAwaitingCode() -> AuthenticationModel {
      let model = previewAwaitingEmail()
      model.state.codeSent()
      return model
    }

    static func previewShowingError(_ error: AuthenticationError) -> AuthenticationModel {
      let model = previewAwaitingCode()
      model.state.failed(error)
      return model
    }
  }
#endif
