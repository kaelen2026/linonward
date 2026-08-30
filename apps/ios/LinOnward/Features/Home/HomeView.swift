import SwiftUI

struct HomeView: View {
  let user: AuthenticatedUser
  let signOut: () async -> Void

  var body: some View {
    TabView {
      Tab("tab.reading", systemImage: "book.pages") {
        NavigationStack {
          ReadingView()
        }
      }

      Tab("tab.profile", systemImage: "person.crop.circle") {
        NavigationStack {
          ProfileView(user: user, signOut: signOut)
        }
      }
    }
    // No `.tint` override. `brandNavy` is navy900, which all but disappears
    // against the dark tab bar, so selection was invisible in dark mode. The
    // asset catalog's AccentColor carries a light and a dark value and applies
    // to every control in the app, this tab bar included.
  }
}

#Preview("Home") {
  HomeView(user: .preview) {}
}

#Preview("简体中文 · Dark") {
  HomeView(user: .preview) {}
  .environment(\.locale, Locale(identifier: "zh-Hans"))
  .preferredColorScheme(.dark)
}
