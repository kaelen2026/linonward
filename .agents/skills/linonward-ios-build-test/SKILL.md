---
name: linonward-ios-build-test
description: Generate, build, test, launch, or diagnose the LinOnward iOS app with XcodeGen, xcodebuild, and iOS Simulator. Use for apps/ios build failures, stale generated projects, test failures, Simulator selection, runtime inspection, or verification after iOS changes; use linonward-ios-feature for implementation and architecture guidance.
---

# LinOnward iOS Build and Test

## Resolve the project before running

- Work from the repository root unless a command says otherwise.
- The project is `apps/ios/LinOnward.xcodeproj`, the shared scheme is `LinOnward`, and the bundle identifier is `com.linonward.app`.
- `apps/ios/project.yml` is authoritative. Never repair a build by editing `project.pbxproj` directly.
- Check the installed Xcode, XcodeGen, available runtimes, and available devices when a failure may be environmental. Report the selected Xcode and destination with the result.

## Generate and verify project freshness

After changing `project.yml`, build settings, target membership, dependencies, or resources:

```bash
pnpm ios:generate
git diff --exit-code -- apps/ios/LinOnward.xcodeproj
```

Interpret a nonzero diff as a stale checked-in project, not as a reason to discard generated output. Review and include the generated project change with its source change.

## Build and test

Use the repository commands for final verification because they mirror CI:

```bash
pnpm ios:build
pnpm ios:test
```

`ios:build` targets a generic Simulator with code signing disabled. `ios:test` selects the first available iPhone Simulator; set `IOS_SIMULATOR_ID` to an explicit available UUID when reproducibility or a particular runtime matters.

For a focused diagnosis, invoke `xcodebuild` with the same project, scheme, Debug configuration, Simulator destination, and `CODE_SIGNING_ALLOWED=NO`. Narrow with `-only-testing:LinOnwardTests/<Suite>` or `-only-testing:LinOnwardUITests/<TestClass>` before rerunning the full command. Do not replace the final repository command with a focused pass.

## Diagnose failures by layer

1. Generation failure: inspect `project.yml` syntax and XcodeGen output.
2. Compile or link failure: capture the first actionable Swift or linker diagnostic, not only the final `BUILD FAILED` line.
3. Destination failure: inspect `xcrun simctl list devices available`, then rerun with a concrete `IOS_SIMULATOR_ID`.
4. Unit-test failure: rerun only the failed suite and inspect its assertion or thrown error.
5. UI-test failure: confirm the app launched, then inspect screenshots, accessibility identifiers, and the failing activity log before changing timing.
6. Runtime failure: collect app-scoped logs and reproduce the exact interaction. If Simulator-control tooling is available, describe the UI before tapping and verify the post-action state visually.

Do not erase DerivedData, reset Simulators, or rewrite project files as a first response. Those actions hide deterministic failures; use them only after evidence identifies corrupted generated state, and disclose the cleanup performed.

When evidence points to hitches, hangs, memory growth, leaks, CPU, energy, or launch latency rather than build/runtime correctness, continue with `$linonward-ios-performance`. Use `$linonward-ios-quality` for flaky automation or accessibility/localization acceptance failures.

## Configuration-sensitive behavior

- Debug defaults to `http://localhost:3001`; release intentionally has no API origin unless the pipeline supplies one.
- Google sign-in is intentionally hidden when `LINONWARD_GOOGLE_CLIENT_ID` is absent. Its absence is not a rendering bug.
- Never print secrets or inspect `.env` files while diagnosing configuration. Report missing variable names and observable behavior only.

## Report

State the exact commands, selected Simulator when relevant, and whether generation, build, unit tests, and UI tests passed separately. Distinguish a code failure from unavailable Xcode, XcodeGen, or Simulator infrastructure.
