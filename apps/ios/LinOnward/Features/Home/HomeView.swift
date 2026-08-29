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
    .tint(Color.brandNavy)
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
