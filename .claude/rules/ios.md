---
paths:
  - "apps/ios/**/*"
---

# iOS rules

These rules apply to the SwiftUI application in `apps/ios`.

## Project ownership

- `project.yml` is the source of truth for `LinOnward.xcodeproj`. Regenerate with
  `pnpm ios:generate`; do not hand-edit `project.pbxproj`.
- Keep deployment targets, bundle identifiers, versions, and build settings in XcodeGen or the
  checked-in xcconfig files. Never add a development team or personal signing identity.
- Keep user-specific Xcode state and build output untracked. Do not delete or rewrite another
  developer's signing or capability configuration.

## SwiftUI architecture

- Use the SwiftUI App lifecycle. Prefer SwiftUI-native APIs; introduce UIKit interoperability only
  for a specific missing capability and keep the bridge narrow.
- Choose ownership before the wrapper: local values use `@State`, child mutation uses `@Binding`,
  shared app services use `@Environment`, and observable reference state requires a real shared or
  long-lived identity. Do not create a view model for plain value state.
- Keep feature-local dependencies explicit. Do not put a service in the environment merely to avoid
  passing it through one or two initializers.
- Use `NavigationStack` and typed destinations when navigation exists. Represent mutually exclusive
  sheets and alerts with one optional destination rather than parallel Boolean flags.
- Keep side effects out of `body`. Use `.task` or `.task(id:)` for lifecycle-bound async work and
  represent loading, empty, failure, retry, and cancellation when they are observable.
- Keep UI state and mutations on `@MainActor`; make cross-actor values `Sendable` and honor task
  cancellation instead of starting detached work to silence isolation errors.

## Product boundaries

- The iOS app crosses into `apps/api` over HTTP. It must not import `packages/db`, backend source,
  or JavaScript workspace internals.
- Treat API payloads, deep links, persisted values, and system callbacks as untrusted boundaries.
  Decode and validate them before they enter feature state.
- Keep user-facing copy in `Localizable.xcstrings`. Maintain English and Simplified Chinese entries
  together, and do not encode layout assumptions that fail under longer text.

## UI quality

- Support Dynamic Type without clipping, dark mode without fixed-background contrast failures, and
  VoiceOver with meaningful labels, values, traits, and traversal order.
- Prefer semantic system colors and controls. Use project assets for brand identity and keep touch
  targets large enough for comfortable interaction.
- Add deterministic `#Preview` coverage for primary and important secondary states. Previews must not
  call live services or rely on global mutable singletons.

## Verification

- Regenerate after project configuration changes and inspect the generated diff.
- Build before attempting Simulator interaction. Run the affected Swift Testing or XCUITest target,
  then inspect the running UI and accessibility tree on an available Simulator.
- Run root `pnpm lint`, `pnpm typecheck`, and `pnpm test`; add `pnpm build` when repository build inputs
  change. Report the exact Xcode scheme, configuration, destination, and any skipped device path.
