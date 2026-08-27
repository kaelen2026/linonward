import SwiftUI

struct HomeView: View {
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

        Label("home.status", systemImage: "checkmark.circle.fill")
          .font(.callout.weight(.medium))
          .foregroundStyle(.secondary)
          .padding(.horizontal, 16)
          .padding(.vertical, 12)
          .background(.thinMaterial, in: .rect(cornerRadius: 14))
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
  }
}

#Preview("Home") {
  NavigationStack {
    HomeView()
  }
}
