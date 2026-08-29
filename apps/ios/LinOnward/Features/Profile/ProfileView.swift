import SwiftUI

struct ProfileView: View {
  let user: AuthenticatedUser
  let signOut: () async -> Void

  @State private var articleUpdatesEnabled = true
  @State private var isSigningOut = false

  var body: some View {
    List {
      Section {
        HStack(spacing: DesignTokens.Spacing.lg) {
          Text(initials)
            .font(.title2.bold())
            .foregroundStyle(Color.brandNavy)
            .frame(width: 58, height: 58)
            .background(Color.brandTeal.opacity(0.2), in: .circle)
            .accessibilityHidden(true)

          VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(user.name)
              .font(.headline)
            Text(user.email)
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }
        }
        .padding(.vertical, DesignTokens.Spacing.sm)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("profile.user")
      }

      Section("profile.settings") {
        Toggle("profile.articleUpdates", systemImage: "bell", isOn: $articleUpdatesEnabled)
          .accessibilityIdentifier("profile.articleUpdates")

        LabeledContent("profile.language") {
          Text("profile.language.current")
            .foregroundStyle(.secondary)
        }

        LabeledContent("profile.appearance") {
          Text("profile.appearance.system")
            .foregroundStyle(.secondary)
        }
      }

      Section("profile.about") {
        LabeledContent("profile.version", value: appVersion)
        Link(destination: URL(string: "https://linonward.com")!) {
          Label("profile.website", systemImage: "safari")
        }
      }

      Section {
        Button("home.signOut", role: .destructive) {
          isSigningOut = true
        }
        .frame(maxWidth: .infinity)
        .accessibilityIdentifier("profile.signOut")
      }
    }
    .navigationTitle("profile.title")
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

  private var initials: String {
    let pieces = user.name.split(separator: " ").prefix(2)
    let result = pieces.compactMap(\.first).map(String.init).joined()
    return result.isEmpty ? String(user.email.prefix(1)).uppercased() : result.uppercased()
  }

  private var appVersion: String {
    Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—"
  }
}

#Preview("Profile") {
  NavigationStack {
    ProfileView(user: .preview) {}
  }
}
