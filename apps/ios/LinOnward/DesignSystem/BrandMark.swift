import SwiftUI

struct BrandMark: View {
  var body: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 14, style: .continuous)
        .fill(Color.brandNavy)

      Image(systemName: "chart.line.uptrend.xyaxis")
        .font(.system(size: 24, weight: .semibold))
        .foregroundStyle(Color.brandTeal)
    }
    .frame(width: 56, height: 56)
    .accessibilityHidden(true)
  }
}

extension Color {
  static let brandNavy = Color(red: 3 / 255, green: 39 / 255, blue: 77 / 255)
  static let brandTeal = Color(red: 13 / 255, green: 178 / 255, blue: 179 / 255)
}
