---
name: linonward-ios-feature
description: Build, refactor, or review SwiftUI features in apps/ios while preserving LinOnward's feature structure, localization, API boundary, authentication invariants, and test strategy. Use for iOS UI, state, navigation, networking, resources, or project configuration changes in this repository; use linonward-ios-build-test for build-only or Simulator-diagnostic work.
---

# LinOnward iOS Feature

## Start from the repository

- Read `apps/ios/README.md`, the nearest feature implementation, and its tests before choosing a pattern.
- Treat `apps/ios/project.yml` as the Xcode project source of truth. Add sources, resources, targets, packages, or build settings there and regenerate the checked-in project; do not hand-edit `project.pbxproj`.
- Keep app lifecycle and root composition in `LinOnward/App`, reusable brand primitives in `DesignSystem`, vertical slices in `Features/<Feature>`, and localized or bundled data in `Resources`.
- Do not introduce a global router, view-model layer, service locator, or other abstraction until the requested behavior needs it. Match the closest existing feature rather than importing a generic architecture.

## Shape the feature

- Prefer SwiftUI-native data flow and the narrowest owner: local value state in the view, explicit inputs for feature-local dependencies, and an observable reference model only when asynchronous or shared feature behavior requires one.
- Keep decisions and transitions outside SwiftUI views when they can be modeled as plain Swift state. Follow `AuthenticationState` as the testable example and keep I/O in injected services or models.
- Keep `body` declarative. Start asynchronous work through lifecycle APIs such as `.task`, expose explicit loading and failure states, and preserve cancellation.
- Add accessibility labels or identifiers for interactive elements that UI tests must address. Do not rely on screen coordinates.
- Preserve iPhone and iPad behavior and the deployment target in `project.yml`; verify current Apple API availability before adopting a newer SDK-only API.

## Preserve project boundaries

- The app communicates with `apps/api` over HTTP. Never import `packages/db` or backend implementation files into iOS code.
- Use the API's documented request and response contract. If the contract must change, update and test both sides rather than duplicating an assumed schema in Swift.
- Authentication uses `Authorization: Bearer` and a `URLSessionConfiguration` that stores no cookies. Do not switch the native client to cookie sessions.
- Preserve the in-app Google authorization-code flow with PKCE, including fresh verifier, state, and nonce values for every attempt. Do not replace it with the web redirect flow.
- Do not embed OAuth client IDs, API origins, secrets, or environment-specific release values in Swift. Route build configuration through the existing xcconfig and `Info.plist` expansion pattern.

## Localize and test

- Put user-visible copy in `LinOnward/Resources/Localizable.xcstrings`; provide both English and Simplified Chinese values. Keep stable keys when changing wording.
- Add Swift Testing coverage in `LinOnwardTests` for state transitions, decoding, request construction, and injected-service behavior. Add `LinOnwardUITests` coverage only for user-visible journeys that require a running app.
- Keep pure logic free of SwiftUI, Keychain, and `URLSession` where practical so unit tests remain fast and Simulator-independent.

## Verify

Use `$linonward-ios-build-test` when available. At minimum, regenerate the project after project-definition changes, inspect the generated diff, then run the narrowest relevant test followed by the repository's iOS build and test commands. Also run the repository-wide checks required by `AGENTS.md` before handing off a completed implementation.

Route cross-cutting work to `$linonward-ios-quality` for accessibility/localization/test acceptance, `$linonward-ios-security-privacy` for identity or personal data, `$linonward-ios-performance` for measured runtime problems, and `$linonward-ios-maintenance` for toolchain or dependency migration. Use `$linonward-ios-release` only when preparing distribution rather than ordinary feature verification.
