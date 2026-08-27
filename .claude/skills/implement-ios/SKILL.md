---
name: implement-ios
description: Implement and verify SwiftUI changes in LinOnward's apps/ios application. Use for app wiring, screens, navigation, state, localization, accessibility, previews, tests, and Simulator behavior.
---

# Implement iOS changes

## Establish scope

1. Read `apps/ios/README.md`, `project.yml`, the affected feature, and nearby tests.
2. Confirm the minimum iOS version, observable behavior, and whether the task crosses the HTTP API or a system capability.
3. Inspect `git status`; preserve unrelated work, generated project ownership, and signing configuration.

## Shape the feature

1. Decide state ownership first. Prefer local value state, bindings for child mutation, and injected services for shared capabilities.
2. Use SwiftUI composition and typed navigation. Add UIKit interoperability only for a concrete capability SwiftUI cannot provide.
3. Model loading, empty, error, cancellation, localization, accessibility, and appearance states that apply.
4. Keep backend contract changes and release operations outside scope unless explicitly delegated.

## Implement and verify

1. Add a failing Swift Testing or XCUITest case first when behavior changes.
2. Keep views small, side effects out of `body`, and asynchronous work in lifecycle tasks or injected services.
3. Add deterministic previews for important visual states without live dependencies.
4. Regenerate the project after changing `project.yml`, then build before running or inspecting the app.
5. Run focused tests, launch on Simulator, inspect the accessibility tree, and check relevant locale and appearance variants.
6. Run the repository checks required by the root instructions before handoff.

## Report

Describe delivered behavior, important state and dependency decisions, generated project changes, exact verification results, and anything not exercised. Do not commit, modify signing, upload a build, or mutate external services unless the user explicitly requests it.
