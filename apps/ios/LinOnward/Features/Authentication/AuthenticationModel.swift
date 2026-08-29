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
  /// `nil` when the build carries no Google client, which hides the button.
  private let google: (any GoogleIdentityProvider)?
  private let tokens: any SessionTokenStore

  init(
    service: (any AuthenticationService)?,
    google: (any GoogleIdentityProvider)? = nil,
    tokens: any SessionTokenStore
  ) {
    self.service = service
    self.google = google
    self.tokens = tokens
  }

  /// Reads the build's configuration and assembles the live stack.
  convenience init(configuration: APIConfiguration = .fromBundle()) {
    let service = configuration.requests.map { LiveAuthenticationService(requests: $0) }
    let google = configuration.googleClient.map { LiveGoogleIdentityProvider(client: $0) }
    self.init(service: service, google: google, tokens: KeychainSessionTokenStore())
  }

  /// Whether this build can offer Google at all.
  var isGoogleAvailable: Bool { google != nil }

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
    let token: String?
    do {
      token = try tokens.read()
    } catch {
      state.signedOut()
      state.failed(.credentialStorage)
      return
    }
    guard let token else {
      state.signedOut()
      return
    }

    switch await service.currentUser(token: token) {
    case .success(let user?):
      state.signedIn(user)
    case .success(nil):
      // The API is the authority and it says this token is spent.
      try? tokens.clear()
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
    guard !state.isBusy else { return }
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
    guard !state.isBusy else { return }
    guard let service else {
      state.failed(.notConfigured)
      return
    }
    state.beginRequest()

    switch await service.signIn(email: state.email, code: state.code) {
    case .success(let session):
      persist(session)
    case .failure(let failure):
      state.failed(failure)
    }
  }

  /// Google first, then the API: the browser proves to Google who this is, and
  /// the id token that comes back is what the API turns into a session of ours.
  ///
  /// The browser arrives as an argument because it comes from the SwiftUI
  /// environment, which only the view can reach — the model is built at launch,
  /// long before there is a scene to present anything in.
  func signInWithGoogle(presentedBy browser: any WebAuthenticationBrowser) async {
    guard !state.isBusy else { return }
    guard let service, let google else {
      state.failed(.notConfigured)
      return
    }
    state.beginRequest()

    let identity: GoogleIdentity
    switch await google.identity(presentedBy: browser) {
    case .identity(let value):
      identity = value
    case .declined:
      state.declined()
      return
    case .failed(let failure):
      state.failed(failure)
      return
    }

    switch await service.signIn(google: identity) {
    case .success(let session):
      persist(session)
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
    let token = try? tokens.read()
    do {
      try tokens.clear()
    } catch {
      state.signedOut()
      state.failed(.credentialStorage)
      return
    }
    state.signedOut()

    if let service, let token {
      _ = await service.signOut(token: token)
    }
  }

  private func persist(_ session: AuthenticatedSession) {
    do {
      try tokens.write(session.token)
      state.signedIn(session.user)
    } catch {
      state.signedOut()
      state.failed(.credentialStorage)
    }
  }
}

#if DEBUG
  /// Preview factories. They live beside the model rather than in
  /// `AuthenticationPreviews.swift` because `state` is `private(set)`, and they
  /// reach each screen through the real transitions — a preview that set the
  /// step directly could show a combination the app can never produce.
  extension AuthenticationModel {
    static func previewAwaitingEmail(google: Bool = true) -> AuthenticationModel {
      let model = AuthenticationModel(
        service: StubAuthenticationService(),
        google: google ? StubGoogleIdentityProvider() : nil,
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
