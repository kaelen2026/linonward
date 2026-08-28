# Package and validate

## Release-readiness gate

Before creating an archive:

1. Confirm the intended `MARKETING_VERSION`, a never-before-uploaded `CURRENT_PROJECT_VERSION` for that version, and the exact git commit. Change version values only when the user supplies or approves them.
2. Run the repository-required checks plus `pnpm ios:generate`, verify the generated Xcode project is current, then run `pnpm ios:build` and `pnpm ios:test`.
3. Inspect `project.yml`, xcconfig files, `Info.plist`, asset catalogs, capabilities, entitlements, privacy manifests, usage descriptions, supported devices and orientations, and localization coverage.
4. Require a real App Icon, a valid Apple Developer team, an App Store Connect app record matching `com.linonward.app`, and signing/provisioning that covers every target and capability.
5. Require a production `LINONWARD_API_BASE_URL`. If Google sign-in is part of the release, require the matching iOS client id and confirm the production API accepts it. Never archive a production candidate with localhost or an empty API origin.
6. Verify the current App Store minimum SDK/Xcode requirements from Apple rather than relying on this repository's historical defaults.

Stop and report blockers instead of weakening signing, inventing identifiers, or silently omitting a production service.

## Archive

Prefer Xcode Organizer for a first manual release because it makes account, signing, validation, and distribution choices visible. Select the `LinOnward` scheme, a generic iOS device destination, Release configuration, and Product > Archive.

For an established CLI or CI flow, preserve the same settings with `xcodebuild archive`: use the checked-in project and scheme, a generic physical iOS destination, an explicit archive path, the approved production configuration values, and normal distribution signing. Never use `CODE_SIGNING_ALLOWED=NO` for a distributable archive.

Do not commit `.xcarchive`, `.ipa`, provisioning profiles, export-options files containing account-specific identifiers, or signing material.

## Validate and export

- Inspect the archive's version, build, bundle id, signing team, entitlements, embedded provisioning, architectures, symbols, and Release configuration before upload.
- Use Organizer's **Validate App** as the default preflight. Treat every validation error as blocking; classify warnings and record why any warning is acceptable.
- For TestFlight and App Store, choose **TestFlight & App Store** / App Store Connect distribution. Use **TestFlight Internal Only** only when the user explicitly wants a disposable internal-only build that will never be submitted for production.
- Export an IPA only when the delivery channel requires it. Keep any `ExportOptions.plist` minimal, generated for the approved distribution method, and free of secrets.

Record the archive path and validation result so the exact artifact can be traced through beta and review.
