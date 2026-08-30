# LinOnward Android

Native Jetpack Compose application for phones and tablets. `minSdk` is 26, the app targets and
compiles against Android 37, and Gradle — not Turborepo — owns the build.

## Requirements

- JDK 17 or newer to start Gradle. The checked-in Daemon criteria pins builds to JDK 17 and Gradle
  downloads it automatically when it is not installed locally.
- An Android SDK with platform 37.1 and `ANDROID_HOME` set, or a `local.properties` naming its path
- Android Studio is optional. Everything below runs from the command line.

## Build and test

Run from the repository root:

```bash
pnpm android:lint    # Android Lint, warnings are errors
pnpm android:test    # JVM unit tests — no emulator, seconds
pnpm android:build   # debug APK
pnpm ci:android      # the same lint, tests, debug and release builds as CI
```

Each is a thin wrapper over the checked-in Gradle wrapper, so `apps/android/gradlew -p apps/android
<task>` does the same thing. The release build (`:app:assembleRelease`) additionally runs R8,
resource shrinking, and `lintVitalRelease`. It fails before compiling unless
`linonward.apiBaseUrl.release` is a non-empty HTTPS origin.

## Gradle Daemon JDK

`gradle/gradle-daemon-jvm.properties` is generated configuration and must stay tracked. It makes
the Daemon use JDK 17 consistently across developer machines and CI. If the JDK baseline changes,
update the task configuration in `build.gradle.kts`, then regenerate the file with:

```bash
apps/android/gradlew -p apps/android updateDaemonJvm
```

## Point the app at an API

The app reads its API origin from `BuildConfig.API_BASE_URL`, filled in at build time from
`linonward.apiBaseUrl.<buildType>` in `gradle.properties` — the same one-origin-per-build contract
as `LINONWARD_API_BASE_URL` in `apps/ios` and `NEXT_PUBLIC_API_URL` in the web workspaces.

Debug defaults to `http://10.0.2.2:3001`. That is the emulator's alias for the *host* loopback, not
the device's own: `localhost` inside an emulator is the emulator. So a Simulator-equivalent build
reaches `pnpm --filter @linonward/api dev` with no configuration at all. On a physical device, run
`adb reverse tcp:3001 tcp:3001` and build with `-Plinonward.apiBaseUrl.debug=http://localhost:3001`.

Cleartext HTTP is permitted **only** for those loopback addresses, through
`res/xml/network_security_config.xml`. Everything else is held to HTTPS; a connection failure
against a real host is not a reason to widen that file.

Release ships the value **empty** on purpose. A release that inherited the local default would
quietly try to reach an address on the phone itself; empty instead prevents a release artifact from
being produced. Supply it from the release pipeline:

```bash
apps/android/gradlew -p apps/android :app:assembleRelease \
  -Plinonward.apiBaseUrl.release=https://api.example.com
```

CI compiles the release variant and runs the instrumentation suite on an emulator. The device tests
cover the Compose sign-in contract and Android Keystore persistence; keep framework-dependent
behaviour there and pure state transitions in the faster JVM suite.

Local and remote CI share `scripts/android-ci.sh` as their canonical entry point. It uses
`https://api.ci.invalid` for the non-deployable release verification build by default; override it
with `LINONWARD_ANDROID_RELEASE_API_BASE_URL` when deliberately verifying another HTTPS origin.

Signing in additionally needs the API's authentication variables set; see
[`apps/api/.env.example`](../api/.env.example).

## Authentication

Sign-in is an email one-time code against Better Auth in `apps/api`: request a code, enter the six
digits, and the app keeps the session token between launches so the next start restores it.

Three details are load-bearing and easy to undo by accident:

- The app authenticates with `Authorization: Bearer`, not cookies, and installs no
  `java.net.CookieHandler`. Better Auth runs its CSRF origin check only on requests carrying a
  `Cookie` header, and a native client sends no `Origin` for it to accept — so the moment the
  session cookie were stored and replayed, every later call would come back `403`.
- Everything the flow decides lives in `AuthenticationState`, which has no Compose, no Android and
  no HTTP in it, so the whole flow is covered by JVM tests that need no device.
- The token is encrypted under an Android Keystore key before it reaches preferences, and both
  backup manifests exclude it. A Keystore key is never backed up, so a restored copy would be
  ciphertext the new device cannot read; excluding it lands a restore on the sign-in screen instead
  of on an unexplained failure.

**Google sign-in is not implemented here yet.** `apps/ios` offers it where the build carries a
Google client; the Android equivalent is a Custom Tabs authorization-code-with-PKCE flow plus its
own OAuth client, and it should arrive as its own change rather than as a half-wired button. The
API-side error codes it would need are deliberately absent from `AuthenticationError` until then.

## Structure

```text
app/src/main/kotlin/com/linonward/app/
  app/            Activity and root composition
  designsystem/   Brand ramp, colour scheme, shared components
  feature/        Feature-first screens and state
app/src/main/res/ Localized copy (en, zh) and the resources the manifest needs
app/src/test/     JVM tests of the flow, the request shapes, and the decoder
```

Keep the app on the HTTP side of the backend boundary. It must not import `packages/db` or backend
implementation files.

## Hybrid article reader

The signed-in home screen can open the same production H5 artifact bundled by iOS. Refresh the
checked-in Android asset after changing `apps/h5`:

```bash
pnpm android:sync-hybrid
```

Android serves it from `https://appassets.androidplatform.net/assets/` through
`WebViewAssetLoader`, never through `file://`. The host negotiates the shared bridge protocol,
binds messages to a page session, blocks mixed content and file access, and hands external HTTPS
or mail links back to Android. The current screen uses the H5 demo article while the Android
article API layer is implemented as the next vertical slice.

Shared colors and dimensions are generated from `design/tokens.json`. Change that source and run
`pnpm design-tokens:generate`; do not edit `BrandColors.kt` directly.

## Conventions worth knowing

- **AGP 9 has built-in Kotlin support.** Applying `org.jetbrains.kotlin.android` on top of
  `com.android.application` is now an error, not a redundancy. The Compose and serialization
  compiler plugins are still applied explicitly.
- **Warnings are errors**, both in Kotlin (`allWarningsAsErrors`) and in Android Lint
  (`warningsAsErrors`). A deprecation is a failing build, which is the point.
- **No Material You dynamic colour.** The palette is the brand ramp shared with `apps/www`, sampled
  from the logo; repainting it from the device wallpaper would discard exactly what it carries. See
  [docs/design-system.md](../../docs/design-system.md) for the contrast rules — brand teal is
  2.61:1 on white and is never text on a light surface.
- **No navigation library.** The app has one axis, signed in or not, and it is already a value in
  `AuthenticationState`. A back stack belongs with the first destination that needs one.
- Versions live in `gradle/libs.versions.toml`; nothing declares a version inline.
