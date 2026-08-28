---
name: linonward-harmony-feature
description: Build, refactor, or review ArkTS and ArkUI features in apps/harmony while preserving LinOnward's stage-model structure, resource localization, adaptive device support, API boundary, and testability. Use for HarmonyOS UI, state, navigation, networking, resources, permissions, or module configuration changes; use linonward-harmony-build-test for build-only or device-diagnostic work.
---

# LinOnward HarmonyOS Feature

## Start from the app's actual shape

- Read `apps/harmony/README.md`, the nearest ArkTS implementation, and its tests before choosing a pattern.
- Treat `apps/harmony/build-profile.json5`, `entry/build-profile.json5`, and `entry/src/main/module.json5` as the sources of truth for products, build modes, targets, abilities, device types, and permissions.
- Keep lifecycle code in `entryability`, reusable brand primitives in `designsystem`, pages in `pages`, pure configuration and URL logic in `config`, and user-facing resources under `entry/src/main/resources`.
- The app deliberately begins with one page and no router, view-model layer, database, or HTTP client. Add only the boundary required by the requested behavior and follow the closest existing implementation.

## Shape ArkUI and ArkTS code

- Keep ArkUI `build()` methods declarative. Move decisions, validation, URL construction, and state transitions into plain ArkTS that does not import ArkUI, generated `BuildProfile`, or network APIs when practical.
- Use the narrowest state owner and explicit inputs. Introduce shared observed state only when behavior genuinely spans components or asynchronous operations.
- Use resource references for user-visible strings and semantic colors. Do not hard-code localized copy or duplicate the brand ramp in ArkTS.
- Preserve phone, tablet, and 2-in-1 layouts declared in `module.json5`. Prefer adaptive constraints and bounded content widths over device-specific coordinates.
- Give interactive controls and user-visible states stable IDs when instrumented tests must locate them. Keep IDs independent of localized text.

## Preserve project contracts

- The app communicates with `apps/api` over HTTP. Never import `packages/db` or backend implementation files into HarmonyOS code.
- Keep the API origin as the `API_BASE_URL` build-profile field. Debug defaults to `http://localhost:3001`; release is intentionally empty and must not inherit localhost.
- If authentication is added, use `Authorization: Bearer`, keep flow decisions in device-independent plain ArkTS, and do not replace the native flow with web cookie sessions.
- Add only permissions required by implemented behavior. Document why each new `requestPermissions` entry is necessary; do not request speculative access.
- Do not commit signing material or a DevEco-generated debug signing configuration. `signingConfigs` is empty in version control by design.

## Localize and test

- Put English fallback strings in `resources/base/element/string.json` and matching Simplified Chinese values in `resources/zh_CN/element/string.json`. Do not create `en_US` solely to duplicate `base`.
- Define semantic light colors in `resources/base/element/color.json` and their dark overrides in `resources/dark/element/color.json`. Follow `docs/design-system.md`; never use brand `teal-500` for body text on white.
- Put pure logic tests in `entry/src/test` with Hypium so they run without a device. Use `entry/src/ohosTest` only for behavior that requires a UIAbility, system service, emulator, or physical device.
- Keep host-testable logic free of ArkUI, device context, and generated build configuration where practical.

## Verify

Use `$linonward-harmony-build-test` when available. Run the narrowest relevant host or instrumented test, then the applicable full HarmonyOS build/test commands. Also run the repository-wide checks required by `AGENTS.md`, while reporting HarmonyOS verification separately because pnpm, Turborepo, and GitHub CI do not include `apps/harmony`.
