---
name: linonward-harmony-build-test
description: Sync, build, test, launch, or diagnose the LinOnward HarmonyOS app with DevEco Studio, hvigor, an emulator, or a device. Use for apps/harmony build failures, missing hvigor wrappers, ArkTS or resource errors, Hypium failures, device selection, runtime inspection, or verification after HarmonyOS changes; use linonward-harmony-feature for implementation and architecture guidance.
---

# LinOnward HarmonyOS Build and Test

## Resolve the environment first

- The DevEco Studio project root is `apps/harmony`; run hvigor commands from that directory.
- Run `scripts/prepare-harmony-profile.sh` before opening or building a fresh checkout. It creates the ignored root `build-profile.json5` from the tracked template without overwriting local signing.
- The app is a stage-model HarmonyOS project compatible with API 12 (`5.0.0(12)`). Its module is `entry`, product is `default`, and targets are `default` and `ohosTest`.
- Prefer `scripts/harmony-ci.sh verify` when HarmonyOS Command Line Tools are installed. Set `HARMONY_CLI_HOME` to the extracted tools directory and `DEVECO_SDK_HOME` to its `sdk` directory, not `sdk/default/openharmony`. The bundled hvigor does not require a project-level wrapper.
- A fresh clone has no project-level `hvigorw`. DevEco Studio 5.0.5 or newer can generate it and `.hvigor/` during sync; both are intentionally gitignored, but this is an alternative to the Command Line Tools workflow rather than a prerequisite.
- Check the installed DevEco Studio, HarmonyOS SDK, project sync, emulator/device availability, and developer-mode connection when a failure may be environmental. Distinguish missing proprietary tooling from a repository defect.

## Build and test

With Command Line Tools, run the repository verification script from the repository root:

```bash
HARMONY_CLI_HOME=/path/to/command-line-tools \
DEVECO_SDK_HOME=/path/to/command-line-tools/sdk \
scripts/harmony-ci.sh verify
```

It runs Code Linter, `assembleHap`, and host tests. Run `scripts/harmony-ci.sh device` separately
when an emulator or developer-mode device is available.

After DevEco sync has generated the project wrapper, these direct commands are also available:

```bash
cd apps/harmony
./hvigorw assembleHap --mode module -p product=default
./hvigorw test
./hvigorw ohosTest
```

- `assembleHap` builds the application package.
- `test` runs host Hypium tests and does not require a device.
- `ohosTest` runs instrumented tests and requires an available emulator or developer-mode device.

For focused diagnosis, narrow to the affected module, target, suite, or task using the installed hvigor version's supported options, then rerun the full applicable command before reporting success. Do not invent wrapper flags from Gradle or another hvigor release; inspect `./hvigorw --help` and the synced toolchain when exact syntax matters.

## Diagnose by layer

1. Missing project wrapper or `.hvigor`: use the bundled Command Line Tools through `scripts/harmony-ci.sh`, or complete DevEco sync. Do not add generated wrapper or SDK artifacts to Git.
2. SDK path failure (`00303312`): ensure `DEVECO_SDK_HOME` names the SDK root containing `default/sdk-pkg.json`; with bundled Command Line Tools this is `$HARMONY_CLI_HOME/sdk`, not its `default/openharmony` child.
3. Project or profile failure: inspect the tracked root `build-profile.template.json5`, ignored local root `build-profile.json5`, and module `build-profile.json5` before changing ArkTS. Never print the local profile because DevEco may have written signing material into it.
4. Resource failure: verify `$r(...)` names exist in `base` and that locale/dark overrides use the same resource names.
5. ArkTS compile failure: report the first actionable compiler diagnostic and source location, not only the final hvigor failure.
6. Host-test failure: rerun the affected Hypium suite and inspect its assertion or thrown error.
7. Instrumented-test or launch failure: confirm the target device is connected and compatible, then separate deployment, permission, ability-lifecycle, locator, and assertion failures.
8. Signing failure: determine whether the task requires a local debug signature or release-pipeline signing. Never commit the machine-generated certificate configuration as a fix.

Do not delete `.hvigor`, SDK caches, emulator data, or generated signing state as a first response. Use cleanup only when evidence identifies corrupted generated state, and disclose exactly what was removed.

## Configuration-sensitive behavior

- Debug builds carry `API_BASE_URL=http://localhost:3001` through `entry/build-profile.json5`.
- Release builds deliberately carry an empty API origin. The home screen should report that no server is configured; this is not a build defect.
- Do not print signing credentials, certificates, tokens, or local environment contents. Report missing configuration names and observable behavior only.

## CI and reporting

GitHub-hosted CI does not build or test `apps/harmony`, because it has no HarmonyOS SDK. Repository-wide pnpm checks therefore do not prove HarmonyOS correctness; installed Command Line Tools can verify it locally or on a suitably configured self-hosted runner.

Report the DevEco Studio and SDK versions when known, exact hvigor commands, product/build mode, emulator or device when relevant, and build, host-test, and instrumented-test results separately. If local HarmonyOS tooling is unavailable, say which checks could not run; do not imply CI covered them.
