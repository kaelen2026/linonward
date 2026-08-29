---
name: linonward-android-feature
description: Build, refactor, or review Kotlin and Jetpack Compose features in apps/android while preserving LinOnward's feature structure, localization, API and authentication boundaries, adaptive UI, and test strategy. Use for Android UI, state, navigation, networking, resources, storage, permissions, or Gradle configuration changes; use linonward-android-build-test for build-only or emulator and device diagnostics.
---

# LinOnward Android Feature

## Start from the app's actual shape

- Read `apps/android/README.md`, the nearest implementation, and its tests before choosing a
  pattern. Follow the root `AGENTS.md` worktree gate before any mutating command.
- Keep Activity and root composition in `app`, reusable brand primitives in `designsystem`, and
  vertical slices in `feature/<feature>`.
- The app currently needs one Activity, one app module, and no navigation or dependency-injection
  framework. Add a back stack, module, repository, or DI container only when the requested behavior
  creates that boundary; do not prebuild a generic architecture.
- Keep the native app on the HTTP side of the backend boundary. Never import `packages/db` or
  backend implementation files.

## Shape Compose and state

- Keep composables declarative and prefer stateless screens with explicit state and event
  callbacks. Use lifecycle-aware Flow collection at composition boundaries.
- Put validation, state transitions, decoding, and request construction in plain Kotlin when they
  do not require Android. `AuthenticationState`, its request factory, and response decoder are the
  local examples.
- Enforce business invariants at the ViewModel or domain command boundary. A disabled Compose
  control improves interaction but is not sufficient protection against duplicate or invalid
  commands.
- Use the narrowest state owner: `remember` for ephemeral UI state, `rememberSaveable` for small
  user-visible state that must survive recreation, and a ViewModel for asynchronous or
  screen-level behavior. Do not retain Activity or view Context in long-lived owners; use the
  application context only where an Android service requires it.
- Preserve coroutine cancellation and expose explicit restoring, busy, success, and failure states.
  Do not launch unscoped work or hide operational failures behind a successful UI state.
- The manifest currently handles rotation and `uiMode` changes. Reconsider that contract before
  adding behavior that depends on normal Activity recreation; do not add more `configChanges` to
  mask lifecycle bugs.

## Preserve platform and service contracts

- Build-time API configuration flows through `BuildConfig.API_BASE_URL`. Debug uses the emulator
  host alias; Release must receive a non-empty HTTPS origin and must never inherit localhost.
- Authentication uses `Authorization: Bearer`, not cookies. Do not install a global
  `CookieHandler` or replay Better Auth's session cookie; native cookie requests would violate the
  current CSRF contract.
- Treat the session token as a credential. Persist it only through `SessionTokenStore`, preserve
  Android Keystore encryption and backup exclusions, and surface persistence failure before
  entering a durable signed-in state.
- Keep cleartext traffic restricted to the existing emulator and loopback hosts. Add only manifest
  permissions required by implemented behavior and explain each new permission.
- Network diagnostics must not contain URLs with sensitive query data, headers, bodies, tokens,
  email addresses, or raw server errors. Prefer error classes, status families, and bounded timing.
- Versions belong in `gradle/libs.versions.toml`; repositories belong in `settings.gradle.kts`.
  Preserve AGP 9 built-in Kotlin support and do not add `org.jetbrains.kotlin.android`.

## Design, localization, and adaptive UI

- Put user-visible copy in `res/values/strings.xml` and provide matching Simplified Chinese values
  in `res/values-zh/strings.xml`. Keep resource names stable when changing wording.
- Use semantic Material theme roles rather than brand ramp constants in feature UI. Follow
  `docs/design-system.md`: brand Teal500 is a surface color and is not body text on white.
- Preserve system dark mode, edge-to-edge layout, RTL support, phones, and tablets. Prefer bounded
  readable widths and scrollable content over device-specific coordinates.
- Give controls correct roles, labels, focus order, minimum touch targets, and live-region behavior
  where asynchronous errors must be announced. UI tests should locate semantics or stable IDs, not
  screen coordinates or fragile layout structure.

## Test at the right boundary

- Use JVM tests in `app/src/test` for state transitions, validation, decoding, request construction,
  and injected-service behavior. These should remain free of Compose, Keystore, and network I/O.
- Use instrumentation tests in `app/src/androidTest` only for contracts that require Android or a
  rendered UI, such as Compose semantics, lifecycle behavior, Android Keystore, manifest policy,
  and complete user journeys.
- Follow red-green-refactor for behavior changes. Run a focused test first, then the full Android CI
  entry point. Do not replace observable assertions with snapshots or tests of implementation
  details.

## Verify

Use `$linonward-android-build-test` when available. Run the narrowest relevant test during the
change, then `pnpm ci:android`; run `:app:connectedDebugAndroidTest` when Android framework or UI
behavior changed and a device is available. Also run the repository-wide checks required by
`AGENTS.md`, while reporting Android verification separately because Turborepo does not include it.
