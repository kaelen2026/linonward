# LinOnward HarmonyOS

Native ArkTS application for HarmonyOS phones, tablets, and 2-in-1 devices. The project is a
DevEco Studio stage-model app built by hvigor, compatible with API 12 (`5.0.0(12)`).

It is the HarmonyOS sibling of [`apps/ios`](../ios): colocated under `apps/` but carrying no
`package.json`, so pnpm does not treat it as a workspace package and Turborepo never schedules a
task for it.

## Requirements

- DevEco Studio 5.0.5 or newer, or HarmonyOS Command Line Tools
- HarmonyOS SDK API 12 or newer (bundled with current Command Line Tools)
- A HarmonyOS emulator or a device in developer mode

## Open and build

Create the ignored, machine-local project profile before opening DevEco Studio:

```bash
scripts/prepare-harmony-profile.sh
```

The script copies `build-profile.template.json5` only when `build-profile.json5` is absent. It
never overwrites an existing profile, so DevEco-managed local signing remains intact.

For a complete local verification with Command Line Tools, point `HARMONY_CLI_HOME` at the
extracted tools directory and `DEVECO_SDK_HOME` at its **SDK root**. Do not point it at the
`default/openharmony` subdirectory:

```bash
HARMONY_CLI_HOME="$HOME/Downloads/command-line-tools" \
DEVECO_SDK_HOME="$HOME/Downloads/command-line-tools/sdk" \
scripts/harmony-ci.sh verify
```

This runs Code Linter, builds the HAP, and runs host Hypium tests without DevEco Studio or a
project-level wrapper. Use `scripts/harmony-ci.sh device` for instrumented tests after connecting
an emulator or developer-mode device.

Alternatively, open `apps/harmony` as the project root in DevEco Studio and let it sync. DevEco
generates the project-level `hvigorw` wrapper and downloads `.hvigor/`; both are gitignored. After
sync, run these commands from `apps/harmony`:

```bash
./hvigorw assembleHap --mode module -p product=default   # build the HAP
./hvigorw test                                           # local unit tests, no device
./hvigorw ohosTest                                       # instrumented tests, needs a device
```

GitHub-hosted runners carry no HarmonyOS SDK. When the repository variable
`HARMONY_CI_ENABLED=true`, `.github/workflows/ci.yml` sends changed HarmonyOS paths to a
repository-owned self-hosted macOS runner for Code Linter, an unsigned build, and host tests. Fork
pull requests never execute on that runner. A separate scheduled/manual workflow runs device tests
on a runner labelled `harmonyos-device`.

If the variable is disabled or the runners are offline, a green hosted run does not cover this
app. Run the Command Line Tools verification locally and say which checks actually ran in the PR
description. Runner provisioning and trust boundaries are documented in
[`docs/harmony-ci.md`](../../docs/harmony-ci.md).

## Signing

`build-profile.template.json5` is the reviewed source of truth for project products, SDK versions,
build modes, and modules. The generated `build-profile.json5` is ignored because DevEco Studio
writes machine paths and debug signing material into it. To change shared project configuration,
validate the change locally, then copy only the non-signing fields into the template for review.

The pre-commit and pre-push hooks plus the always-running CI scope job reject a tracked local profile, known
signing fields, signing files, or a non-empty `signingConfigs` in the template. Release signing
comes from the release pipeline, not from the repository.

## Point the app at an API

The API origin is a build-time constant, one origin per build — the same contract as
`LINONWARD_API_BASE_URL` in `apps/ios` and `NEXT_PUBLIC_API_URL` in the web workspaces. It lives in
`entry/build-profile.json5` under `arkOptions.buildProfileFields`, and hvigor compiles it into the
generated `BuildProfile` class that `entry/src/main/ets/config/ApiConfiguration.ets` reads.

Debug defaults to `http://localhost:3001`, which is where `pnpm --filter @linonward/api dev`
listens. Release ships the value **empty** on purpose: a release that inherited the debug default
would quietly try to reach `localhost` on somebody's phone, whereas empty surfaces "no server
configured" on the home screen.

The home screen prints whichever origin the build carries, because which server an install talks
to is otherwise invisible until a request fails.

## Structure

```text
AppScope/                        Bundle identity, app label, app icon
entry/src/main/ets/config/       Build-time API origin, and the pure URL logic under it
entry/src/main/ets/designsystem/ Brand primitives shared by pages
entry/src/main/ets/entryability/ UIAbility lifecycle and window stage
entry/src/main/ets/pages/        ArkUI pages, declared in resources/base/profile/main_pages.json
entry/src/main/resources/        base (English fallback), zh_CN, dark, media, profiles
entry/src/test/                  Host unit tests — hypium, no device
entry/src/ohosTest/              Instrumented UI tests — hypium + UiTest, needs a device
```

## Hybrid article reader

The home page can open the same production H5 artifact bundled by iOS and Android. Refresh and
verify all three checked-in native artifacts after changing `apps/h5`:

```bash
pnpm hybrid:sync
pnpm hybrid:check
```

`pnpm harmony:sync-hybrid` remains available when intentionally updating only the HarmonyOS
rawfile.

The ArkUI `Web` component loads the artifact with `$rawfile`, exposes only the shared
`LinOnwardBridge.postMessage` proxy, negotiates a page session, and disables file access, DOM
storage, and mixed content. The current screen injects a preview article while the HarmonyOS
authentication and article API layers remain planned. Device coverage is still required before
promoting the capability from Planned to Preview in `docs/capabilities.md`.

Colors come from the brand ramp in [docs/design-system.md](../../docs/design-system.md), named
semantically in `resources/base/element/color.json` and flipped by
`resources/dark/element/color.json`, which the system applies on the dark color mode — the same
split as the `:root` / `prefers-color-scheme` layers in `apps/www`. `text_accent` is `teal-700` in
light mode and `teal-300` in dark, never `teal-500`, which is 2.61:1 on white.

Those color resources and `DesignTokens.generated.ets` are generated from `design/tokens.json`.
Change the shared source and run `pnpm design-tokens:generate`; do not edit generated outputs
directly.

`base` is the fallback locale and holds English; `zh_CN` overrides it. There is no `en_US`
directory, because it would only duplicate `base` and drift from it.

## What is deliberately absent

The shell has one page, no router, no view-model layer, no database, and no HTTP client. Those
boundaries should appear with the first behavior that needs them.

Authentication is the largest gap against `apps/ios`, which signs in with an email one-time code
and Google. Adding it here means the same rules: `Authorization: Bearer` rather than cookies, the
flow's decisions in a plain class with no ArkUI and no network in it so `entry/src/test` can cover
them, and everything on the HTTP side of `apps/api` — this app must never import `packages/db` or
backend implementation files.
