# LinOnward iOS

Native SwiftUI application for iPhone and iPad. The deployment target is iOS 26 and the project is
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
hand. `ios:test` uses the first available iPhone Simulator. Set `IOS_SIMULATOR_FAMILY=iPad` to
select the first iPad instead, or set `IOS_SIMULATOR_ID` to choose a specific available device.
CI verifies the documented Xcode and XcodeGen versions and runs the suite on both device families.

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

## Turn on Google sign-in

The Google button appears only when the build carries a client id, and is hidden otherwise — the
default in every configuration, because an OAuth client is tied to one bundle id.

1. In the same Google Cloud project the console uses, create an **iOS** OAuth client for
   `com.linonward.app`. A web client will not do: Google refuses to redirect one to a custom URL
   scheme. It has no client secret, which is why the app uses PKCE.
2. Give the API the same client id as `GOOGLE_IOS_CLIENT_ID` (see
   [`apps/api/.env.example`](../api/.env.example)), so it accepts id tokens minted for it.
3. Build with the client id:

```bash
xcodebuild … LINONWARD_GOOGLE_CLIENT_ID='123456-abcdef.apps.googleusercontent.com'
```

The client id is not a secret and needs no `CFBundleURLTypes` entry: `ASWebAuthenticationSession`
intercepts the reversed-client-id redirect itself rather than reopening the app through it.
Configure only one half and the failure is visible rather than silent — no client id hides the
button, and a client id the API does not know produces "Google sign-in is unavailable".

## Authentication

Sign-in is an email one-time code against Better Auth in `apps/api`: request a code, enter the
six digits, and the app keeps the session token in the Keychain so the next launch restores it.
Where the build carries a Google client, the same screen also offers **Continue with Google**.

Three details are load-bearing and easy to undo by accident:

- The app authenticates with `Authorization: Bearer`, not cookies, and `URLSession.authentication`
  is configured to store none. Better Auth runs its CSRF origin check only on requests carrying a
  `Cookie` header, and a native client sends no `Origin` for it to accept — so the moment the
  session cookie were kept and replayed, every later call would come back `403`.
- Everything the flow decides lives in `AuthenticationState`, which has no SwiftUI, no Keychain
  and no URLSession in it, so `LinOnwardTests` can cover the whole flow without a Simulator.
- Google sign-in runs **in the app**, not through the API's redirect. Better Auth's browser flow
  can only come back to an `https` address and a phone has none, so the app runs authorization
  code with PKCE itself (`GoogleSignIn.swift`) and posts the resulting id token to
  `/api/auth/sign-in/social`. The verifier, `state`, and `nonce` are what make that safe without
  a client secret; none of them may be reused between attempts.

Open `apps/ios/LinOnward.xcodeproj` in Xcode for previews and interactive Simulator debugging.

## Run the H5 article reader

The signed-in home screen opens the Vite article reader inside a locked-down `WKWebView`. Start
the H5 development server before opening it in a Debug Simulator build:

```bash
pnpm --filter @linonward/h5 dev
```

Debug reads `http://localhost:3003/` from `LINONWARD_ARTICLE_READER_URL`. Release deliberately
leaves this empty and accepts only an explicitly supplied HTTPS URL. The WebView permits main-frame
navigation only within that exact origin; article links are validated and handed to the system.

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

Shared colors and dimensions are generated from `design/tokens.json`. Change that source and run
`pnpm design-tokens:generate`; do not edit `DesignTokens.generated.swift` directly.
