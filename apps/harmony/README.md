# LinOnward HarmonyOS

Native ArkTS application for HarmonyOS phones, tablets, and 2-in-1 devices. The project is a
DevEco Studio stage-model app built by hvigor, compatible with API 12 (`5.0.0(12)`).

It is the HarmonyOS sibling of [`apps/ios`](../ios): colocated under `apps/` but carrying no
`package.json`, so pnpm does not treat it as a workspace package and Turborepo never schedules a
task for it.

## Requirements

- DevEco Studio 5.0.5 or newer
- HarmonyOS SDK API 12 or newer
- A HarmonyOS emulator or a device in developer mode

## Open and build

Open `apps/harmony` as the project root in DevEco Studio and let it sync. The sync is what
generates the `hvigorw` wrapper and downloads hvigor into `.hvigor/`; both are gitignored, so a
fresh clone has no command line until it has been synced once. After that, from `apps/harmony`:

```bash
./hvigorw assembleHap --mode module -p product=default   # build the HAP
./hvigorw test                                           # local unit tests, no device
./hvigorw ohosTest                                       # instrumented tests, needs a device
```

There is **no CI job for this app.** GitHub-hosted runners carry no HarmonyOS SDK and Huawei does
not publish the toolchain for unauthenticated download, so `.github/workflows/ci.yml` cannot gate
it the way the `ios` job gates Xcode. Until a self-hosted runner with the SDK exists, building and
testing this app before opening a PR is a manual step — say so in the PR description rather than
implying CI covered it.

## Signing

`build-profile.json5` ships `signingConfigs: []` on purpose. DevEco Studio writes an automatically
generated debug config into that array on first run, keyed to the machine's certificate; that edit
is local state and must not be committed. Release signing comes from the release pipeline, not
from the repository.

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

Colors come from the brand ramp in [docs/design-system.md](../../docs/design-system.md), named
semantically in `resources/base/element/color.json` and flipped by
`resources/dark/element/color.json`, which the system applies on the dark color mode — the same
split as the `:root` / `prefers-color-scheme` layers in `apps/www`. `text_accent` is `teal-700` in
light mode and `teal-300` in dark, never `teal-500`, which is 2.61:1 on white.

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
