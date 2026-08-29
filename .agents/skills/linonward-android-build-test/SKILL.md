---
name: linonward-android-build-test
description: Build, test, launch, or diagnose the LinOnward Android app with Gradle, Android Emulator, or a device. Use for apps/android build failures, Android Lint, JVM or instrumentation tests, SDK and JDK setup, emulator selection, R8 release verification, runtime inspection, or verification after Android changes; use linonward-android-feature for implementation and architecture guidance.
---

# LinOnward Android Build and Test

## Resolve the environment first

- Work from the repository root unless a command says otherwise. `apps/android` is an independent
  Gradle build and is outside the pnpm/Turborepo task graph.
- Use the checked-in `apps/android/gradlew` wrapper. The build requires JDK 17 and an Android SDK
  containing platform 37.1 and Build Tools 37.0.0; the checked-in daemon criteria can provision the
  JDK but not the Android SDK.
- Check `java -version`, `apps/android/gradlew -p apps/android --version`, SDK availability, and
  `adb devices` when a failure may be environmental. Distinguish toolchain or device availability
  from a repository defect.
- Do not apply `org.jetbrains.kotlin.android`: AGP 9 provides built-in Kotlin support and applying
  the plugin is a hard error. Compose and serialization compiler plugins remain explicit.

## Run the repository verification

Use the shared local/remote CI entry point for final host-side verification:

```bash
pnpm ci:android
```

It runs Android Lint, JVM tests, the Debug build, and the R8-enabled Release build through
`scripts/android-ci.sh`. The non-deployable verification Release uses `https://api.ci.invalid` by
default. Override `LINONWARD_ANDROID_RELEASE_API_BASE_URL` only when deliberately checking another
HTTPS origin; a missing or non-HTTPS Release origin must fail the build.

For a focused loop, use the narrowest relevant task before rerunning `pnpm ci:android`:

```bash
apps/android/gradlew -p apps/android :app:testDebugUnitTest --tests '*AuthenticationStateTest'
apps/android/gradlew -p apps/android :app:lintDebug
apps/android/gradlew -p apps/android :app:compileDebugAndroidTestKotlin
```

Do not treat root `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm build` as Android
verification; none traverses the native app.

## Run device tests

Instrumentation tests require an available Android Emulator or developer-mode device:

```bash
adb devices
apps/android/gradlew -p apps/android :app:connectedDebugAndroidTest
```

- Prefer an existing compatible AVD. Confirm `sys.boot_completed=1` before starting Gradle.
- If multiple devices are connected, select one explicitly with the Android Gradle Plugin's
  supported device controls rather than relying on list order.
- Shut down only an emulator started for the task; never erase an AVD or physical-device data as a
  troubleshooting shortcut.
- GitHub CI runs the suite on an API 35 x86_64 emulator. A different local ABI is acceptable, but
  report the API level, ABI, and device when behavior may depend on them.

## Diagnose by layer

1. Wrapper or JDK failure: verify the checked-in wrapper and JDK 17 daemon criteria before changing
   application code.
2. SDK failure: verify platform 37.1, Build Tools 37.0.0, `ANDROID_HOME`, and `local.properties`.
   Never commit a machine-specific SDK path.
3. Dependency or plugin failure: inspect `gradle/libs.versions.toml`, repository declarations, and
   AGP 9 built-in Kotlin constraints. Versions belong in the catalog, not inline.
4. Compile or resource failure: report the first actionable Kotlin, manifest, or AAPT diagnostic
   with its source location.
5. Lint failure: fix the finding; warnings are errors and the project deliberately has no baseline
   for hiding new debt.
6. JVM-test failure: rerun the affected class or method, then the full JVM suite.
7. Instrumentation failure: separate APK installation, runner startup, Compose locator,
   Android Keystore, lifecycle, and assertion failures. Inspect the test report and app-scoped
   logs before adding waits.
8. Release-only failure: isolate Release configuration validation, R8, resource shrinking,
   `lintVitalRelease`, packaging, and signing. The CI Release artifact is intentionally unsigned
   for distribution and uses a non-production origin.

Do not delete Gradle caches, emulator data, or generated reports as a first response. Clean only
when evidence identifies corrupt generated state, and disclose what was removed.

## Runtime and configuration boundaries

- Debug defaults to `http://10.0.2.2:3001`. A physical device can use `adb reverse tcp:3001
  tcp:3001` with a localhost build override.
- Cleartext is allowed only for the loopback hosts in `network_security_config.xml`. Do not widen
  it to fix a real-host connection failure.
- Never print bearer tokens, authentication bodies, local properties, signing material, or other
  secrets. Prefer low-cardinality, privacy-safe diagnostics.

## Report

State the exact commands and distinguish Android Lint, JVM tests, instrumentation tests, Debug
build, and Release/R8 results. Name the emulator or device when used. If SDK or device tooling is
unavailable, say which checks were not run rather than implying root pnpm checks covered them.
