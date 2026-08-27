import SwiftUI

struct AppView: View {
  var body: some View {
    NavigationStack {
      HomeView()
    }
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
