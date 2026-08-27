# LinOnward iOS

Native SwiftUI application for iPhone and iPad. The deployment target is iOS 18 and the project is
generated with XcodeGen.

## Requirements

- Xcode 26 or newer
- XcodeGen 2.46 or newer
- An installed iOS Simulator runtime

## Generate and build

Run from the repository root:

```bash
pnpm ios:generate
pnpm ios:build
pnpm ios:test
```

`project.yml` is the source of truth for `LinOnward.xcodeproj`; do not edit `project.pbxproj` by
hand. `ios:test` uses the first available iPhone Simulator. Set `IOS_SIMULATOR_ID` to select a
specific available device.

## Point the app at an API

The app reads its API origin from the `LinOnwardAPIBaseURL` key in `Info.plist`, filled in at
build time from `LINONWARD_API_BASE_URL` in the xcconfig files — the same one-origin-per-build
contract as `NEXT_PUBLIC_API_URL` in the web workspaces.

Debug defaults to `http://localhost:3001`, which is where `pnpm --filter @linonward/api dev`
listens, so a Simulator build needs no configuration. Signing in additionally needs the API's
authentication variables set; see [`apps/api/.env.example`](../api/.env.example).

Release ships the value **empty** on purpose. A release that inherited the local default would
quietly try to reach `localhost` on somebody's phone; empty instead surfaces "no server
configured" on the sign-in screen. Supply it from the release pipeline:

```bash
xcodebuild … LINONWARD_API_BASE_URL='https:/$()/api.example.com'
```

## Authentication

Sign-in is an email one-time code against Better Auth in `apps/api`: request a code, enter the
six digits, and the app keeps the session token in the Keychain so the next launch restores it.

Two details are load-bearing and easy to undo by accident:

- The app authenticates with `Authorization: Bearer`, not cookies, and `URLSession.authentication`
  is configured to store none. Better Auth runs its CSRF origin check only on requests carrying a
  `Cookie` header, and a native client sends no `Origin` for it to accept — so the moment the
  session cookie were kept and replayed, every later call would come back `403`.
- Everything the flow decides lives in `AuthenticationState`, which has no SwiftUI, no Keychain
  and no URLSession in it, so `LinOnwardTests` can cover the whole flow without a Simulator.

Open `apps/ios/LinOnward.xcodeproj` in Xcode for previews and interactive Simulator debugging.

## Structure

```text
LinOnward/App/           SwiftUI lifecycle and root composition
LinOnward/DesignSystem/  Brand primitives shared by features
LinOnward/Features/      Feature-first screens and state
LinOnward/Resources/     Asset catalogs and localized copy
LinOnwardTests/          Swift Testing coverage of flow logic
LinOnwardUITests/        End-to-end user-visible behavior
```

Keep the app on the HTTP side of the backend boundary. It must not import `packages/db` or backend
implementation files.
