import SwiftUI

struct HomeView: View {
  let user: AuthenticatedUser
  let signOut: () async -> Void

  @State private var isSigningOut = false

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 28) {
        BrandMark()

        VStack(alignment: .leading, spacing: 12) {
          Text("home.eyebrow")
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(Color.brandTeal)

          Text("home.title")
            .font(.largeTitle.bold())
            .foregroundStyle(.primary)
            .accessibilityIdentifier("home.title")

          Text("home.body")
            .font(.body)
            .foregroundStyle(.secondary)
        }

        Label("home.greeting \(user.name)", systemImage: "checkmark.circle.fill")
          .font(.callout.weight(.medium))
          .foregroundStyle(.secondary)
          .padding(.horizontal, 16)
          .padding(.vertical, 12)
          .background(.thinMaterial, in: .rect(cornerRadius: 14))
          .accessibilityIdentifier("home.greeting")

        NavigationLink {
          ArticleReaderView()
        } label: {
          Label("article.reader.open", systemImage: "doc.text.image")
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .tint(Color.brandNavy)
        .controlSize(.large)
        .accessibilityIdentifier("article.reader.open")
      }
      .frame(maxWidth: 560, alignment: .leading)
      .padding(.horizontal, 24)
      .padding(.vertical, 40)
    }
    .background {
      LinearGradient(
        colors: [Color.brandTeal.opacity(0.12), Color.clear],
        startPoint: .topTrailing,
        endPoint: .center
      )
      .ignoresSafeArea()
    }
    .navigationTitle("app.name")
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        // A menu rather than a bare button: signing out is destructive enough
        // that it should not sit one mistap from the navigation bar, and the
        // menu is also where the signed-in address belongs.
        Menu {
          Section(user.email) {
            Button("home.signOut", role: .destructive) {
              isSigningOut = true
            }
          }
        } label: {
          Label("home.account", systemImage: "person.crop.circle")
        }
        .accessibilityIdentifier("home.account")
      }
    }
    .confirmationDialog(
      "home.signOut.confirm",
      isPresented: $isSigningOut,
      titleVisibility: .visible
    ) {
      Button("home.signOut", role: .destructive) {
        Task { await signOut() }
      }
      Button("common.cancel", role: .cancel) {}
    }
  }
}

#Preview("Home") {
  NavigationStack {
    HomeView(user: .preview) {}
  }
}

#Preview("简体中文 · Dark") {
  NavigationStack {
    HomeView(user: .preview) {}
  }
  .environment(\.locale, Locale(identifier: "zh-Hans"))
  .preferredColorScheme(.dark)
}
