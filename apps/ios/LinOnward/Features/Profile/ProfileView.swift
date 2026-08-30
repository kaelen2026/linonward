import SwiftUI

struct ProfileView: View {
  let user: AuthenticatedUser
  let signOut: () async -> Void

  // Capped: `@ScaledMetric` is unbounded, and at AX5 an uncapped 62 becomes
  // ~109pt, which pushes the name and address off a narrow row.
  @ScaledMetric(relativeTo: .largeTitle) private var scaledAvatar: CGFloat = 62
  @State private var articleUpdatesEnabled = true
  @State private var isSigningOut = false

  var body: some View {
    List {
      Section {
        identity
      }

      Section("profile.settings") {
        Toggle(isOn: $articleUpdatesEnabled) {
          SettingsRowLabel("profile.articleUpdates", systemImage: "bell.fill", tint: .teal700)
        }
        .accessibilityIdentifier("profile.articleUpdates")

        LabeledContent {
          Text("profile.language.current")
            .foregroundStyle(.secondary)
        } label: {
          SettingsRowLabel("profile.language", systemImage: "globe", tint: .navy700)
        }

        LabeledContent {
          Text("profile.appearance.system")
            .foregroundStyle(.secondary)
        } label: {
          SettingsRowLabel(
            "profile.appearance",
            systemImage: "circle.lefthalf.filled",
            tint: .navy600
          )
        }
      }

      Section("profile.about") {
        LabeledContent {
          Text(appVersion)
            .foregroundStyle(.secondary)
            .monospacedDigit()
        } label: {
          SettingsRowLabel("profile.version", systemImage: "info.circle.fill", tint: .navy700)
        }

        Link(destination: URL(string: "https://linonward.com")!) {
          // A plain `HStack` rather than `LabeledContent`: the automatic style
          // takes its leading/trailing split from the list row, and a `Link`
          // between the two is not a context it is specified to handle.
          HStack {
            SettingsRowLabel("profile.website", systemImage: "safari.fill", tint: .teal600)

            Spacer(minLength: DesignTokens.Spacing.sm)

            // The standard "leaves the app" affordance; without it the row
            // looks like it opens another screen in the tab.
            Image(systemName: "arrow.up.right")
              .font(.footnote.weight(.semibold))
              .foregroundStyle(.tertiary)
              .accessibilityHidden(true)
          }
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
    .listStyle(.insetGrouped)
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

  /// The account row, given the weight the Apple ID row has at the top of
  /// Settings: it is the one thing on this screen that is about the person
  /// rather than about a preference.
  private var avatar: CGFloat { min(scaledAvatar, 88) }

  private var identity: some View {
    HStack(spacing: DesignTokens.Spacing.lg) {
      Text(initials)
        .font(.system(size: avatar * 0.4, weight: .semibold))
        .foregroundStyle(.white)
        .frame(width: avatar, height: avatar)
        .background(
          LinearGradient(
            colors: [.navy900, .teal700],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          ),
          in: .circle
        )
        .accessibilityHidden(true)

      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        Text(user.name)
          .font(.title3.weight(.semibold))
          .lineLimit(2)

        Text(user.email)
          .font(.subheadline)
          .foregroundStyle(.secondary)
          // A long address is more recognisable with its domain intact than
          // with its tail cut off.
          .lineLimit(1)
          .truncationMode(.middle)
      }
    }
    .padding(.vertical, DesignTokens.Spacing.sm)
    .accessibilityElement(children: .combine)
    .accessibilityIdentifier("profile.user")
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

/// A Settings.app row label: a tinted glyph tile, then the title. The tile is
/// what makes a settings list scannable — every row gets an anchor at the
/// leading edge instead of presenting a wall of same-weight text.
private struct SettingsRowLabel: View {
  // Settings' own proportions: a rounded square a little larger than the text
  // it sits beside, with a radius of about a quarter of its side. Capped
  // because `@ScaledMetric` is unbounded, and a 90pt glyph tile at AX5 leaves a
  // `Toggle` row no width for its label.
  @ScaledMetric(relativeTo: .body) private var scaledTile: CGFloat = 29

  private let title: LocalizedStringKey
  private let systemImage: String
  private let tint: Color

  private var tile: CGFloat { min(scaledTile, 44) }

  init(_ title: LocalizedStringKey, systemImage: String, tint: Color) {
    self.title = title
    self.systemImage = systemImage
    self.tint = tint
  }

  var body: some View {
    Label {
      // `Link` tints its whole content, and an accent-coloured row title would
      // read as the tappable thing when the entire row already is.
      Text(title).foregroundStyle(.primary)
    } icon: {
      Image(systemName: systemImage)
        .font(.system(size: tile * 0.48, weight: .semibold))
        // Every tint here clears 3:1 against white, so the glyph stays legible
        // in both appearances. See docs/design-system.md for the ramp.
        .foregroundStyle(.white)
        .frame(width: tile, height: tile)
        .background(tint, in: .rect(cornerRadius: tile * 0.25, style: .continuous))
    }
  }
}

#Preview("Profile") {
  NavigationStack {
    ProfileView(user: .preview) {}
  }
}

#Preview("简体中文 · Dark") {
  NavigationStack {
    ProfileView(user: .preview) {}
  }
  .environment(\.locale, Locale(identifier: "zh-Hans"))
  .preferredColorScheme(.dark)
}

#Preview("Accessibility XL") {
  NavigationStack {
    ProfileView(user: .preview) {}
  }
  .environment(\.dynamicTypeSize, .accessibility2)
}
