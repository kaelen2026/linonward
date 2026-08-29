import SwiftUI

struct BrandMark: View {
  var body: some View {
    ZStack {
      RoundedRectangle(cornerRadius: DesignTokens.Radius.brandMark, style: .continuous)
        .fill(Color.brandNavy)

      Image(systemName: "chart.line.uptrend.xyaxis")
        .font(.system(size: 24, weight: .semibold))
        .foregroundStyle(Color.brandTeal)
    }
    .frame(width: DesignTokens.Size.brandMark, height: DesignTokens.Size.brandMark)
    .accessibilityHidden(true)
  }
}
