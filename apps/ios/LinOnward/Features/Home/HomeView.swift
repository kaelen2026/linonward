import SwiftUI

struct HomeView: View {
  let user: AuthenticatedUser
  @Binding var articleDeepLink: ArticleDeepLink?
  let signOut: () async -> Void

  var body: some View {
    TabView {
      Tab("tab.reading", systemImage: "book.pages") {
        NavigationStack {
          ReadingView(deepLink: $articleDeepLink)
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
  HomeView(user: .preview, articleDeepLink: .constant(nil)) {}
}

#Preview("简体中文 · Dark") {
  HomeView(user: .preview, articleDeepLink: .constant(nil)) {}
  .environment(\.locale, Locale(identifier: "zh-Hans"))
  .preferredColorScheme(.dark)
}
