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

Open `apps/ios/LinOnward.xcodeproj` in Xcode for previews and interactive Simulator debugging.

## Structure

```text
LinOnward/App/           SwiftUI lifecycle and root composition
LinOnward/DesignSystem/  Brand primitives shared by features
LinOnward/Features/      Feature-first screens and state
LinOnward/Resources/     Asset catalogs and localized copy
LinOnwardUITests/        End-to-end user-visible behavior
```

Keep the app on the HTTP side of the backend boundary. It must not import `packages/db` or backend
implementation files.
