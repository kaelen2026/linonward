import SwiftUI

// Isolated explicitly: `AuthenticationModel` is `@MainActor`, and under
// complete strict concurrency a default value for a stored property has to be
// built somewhere the compiler knows is the main actor.
@MainActor
struct AppView: View {
  @State private var auth = AuthenticationModel()
  @State private var articleDeepLink: ArticleDeepLink?

  var body: some View {
    Group {
      switch auth.state.step {
      case .restoring:
        NavigationStack {
          RestoringView()
        }
      case .email, .code:
        NavigationStack {
          SignInView(model: auth)
        }
      case .signedIn(let user):
        HomeView(user: user, articleDeepLink: $articleDeepLink) { await auth.signOut() }
      }
    }
    // Once per launch: turns a stored token back into a session before the
    // sign-in form would otherwise appear.
    .task {
      await auth.restore()
    }
    .onOpenURL { url in
      articleDeepLink = ArticleDeepLink(url: url)
    }
  }
}

/// The launch state, held only as long as the session check takes.
private struct RestoringView: View {
  var body: some View {
    ProgressView()
      .controlSize(.large)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .accessibilityLabel("session.restoring")
      .accessibilityIdentifier("session.restoring")
  }
}

#Preview("English") {
  AppView()
    .environment(\.locale, Locale(identifier: "en"))
}

#Preview("简体中文 · Dark") {
  AppView()
    .environment(\.locale, Locale(identifier: "zh-Hans"))
    .preferredColorScheme(.dark)
}
