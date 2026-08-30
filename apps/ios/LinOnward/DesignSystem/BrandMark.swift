import SwiftUI

/// The app's identity tile. A flat fill reads as a missing app icon once the
/// mark is large enough to be the first thing on a screen, so it carries the
/// brand gradient and a soft shadow instead.
struct BrandMark: View {
  /// The token pair, kept as a ratio so the corner stays in proportion at any
  /// size rather than looking square when the mark grows.
  private static let cornerRatio = DesignTokens.Radius.brandMark / DesignTokens.Size.brandMark

  var size: CGFloat = DesignTokens.Size.brandMark

  var body: some View {
    RoundedRectangle(cornerRadius: size * Self.cornerRatio, style: .continuous)
      .fill(
        LinearGradient(
          colors: [.navy800, .navy950],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        )
      )
      .overlay {
        Image(systemName: "chart.line.uptrend.xyaxis")
          .font(.system(size: size * 0.42, weight: .semibold))
          // teal300 rather than the teal500 brand step: the glyph sits on the
          // darkest navy, where the lighter step is what carries.
          .foregroundStyle(Color.teal300)
      }
      .frame(width: size, height: size)
      .shadow(color: .navy950.opacity(0.25), radius: size * 0.16, y: size * 0.07)
      .accessibilityHidden(true)
  }
}

#Preview("Brand mark") {
  VStack(spacing: DesignTokens.Spacing.xxl) {
    BrandMark()
    BrandMark(size: 72)
  }
  .padding(DesignTokens.Spacing.xxxxl)
}
