import SwiftUI

@main
struct LinOnwardApp: App {
  var body: some Scene {
    WindowGroup {
      AppView()
        .task {
          guard let channelURL = HybridUpdateConfiguration.channelURL() else { return }
          try? await HybridBundleUpdater().refresh(
            channelURL: channelURL,
            appVersion: HybridUpdateConfiguration.appVersion(),
            rolloutSeed: HybridUpdateConfiguration.rolloutSeed()
          )
        }
    }
  }
}
