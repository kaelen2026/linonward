---
name: linonward-ios-release
description: Prepare, archive, validate, beta-distribute, or submit the LinOnward iOS app through TestFlight and App Store Connect. Use for release readiness, version and build numbers, signing, IPA or xcarchive creation, internal or external testing, App Store metadata, review submission, or release troubleshooting; do not use for ordinary Simulator builds.
---

# LinOnward iOS Release

## Choose the release stage

Inspect the current repository and App Store Connect state before acting, then load only the relevant guide:

- For signing readiness, versions, Release configuration, archives, validation, or export, read [references/package.md](references/package.md).
- For internal or external TestFlight distribution and beta feedback, read [references/testflight.md](references/testflight.md).
- For store metadata, App Review, release controls, or a rejected submission, read [references/app-store.md](references/app-store.md).

Use the same validated App Store Connect archive for TestFlight and eventual App Review. Do not choose Xcode's **TestFlight Internal Only** distribution method when that build may become the production candidate; Apple does not allow that upload to proceed to App Review.

Before release readiness, use `$linonward-ios-quality` for the acceptance matrix and `$linonward-ios-security-privacy` for privacy-manifest and data-practice evidence. Use `$linonward-ios-performance` when beta or Organizer evidence shows crashes, hangs, leaks, or responsiveness regressions.

## Project facts to recheck, not assume

- Source of truth: `apps/ios/project.yml`; project: `apps/ios/LinOnward.xcodeproj`; scheme: `LinOnward`; bundle id: `com.linonward.app`.
- Version and build number live in `apps/ios/Config/Base.xcconfig` as `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION`.
- Release intentionally has no API origin unless `LINONWARD_API_BASE_URL` is supplied. Google sign-in is present only when `LINONWARD_GOOGLE_CLIENT_ID` is supplied.
- At the time this skill was created, the repository had no `DEVELOPMENT_TEAM` and no configured App Icon name. Always inspect current files because those blockers may later be resolved.
- App Store requirements, supported SDKs, privacy declarations, and review questions change. Verify current Apple Developer and App Store Connect documentation before giving a readiness verdict or changing submission metadata.

## Authorization boundary

Local inspection, generation, tests, archives, and validation are reversible preparation. Uploading a binary, changing tester access, submitting for Beta App Review or App Review, accepting agreements, changing pricing or availability, and releasing a version mutate external state and require the user's explicit authorization for that exact stage.

Never guess legal, privacy, encryption/export-compliance, content-rights, age-rating, tracking, or account-owner answers. Present the evidence and ask the responsible person to decide. Never read, print, commit, or embed signing certificates, private keys, App Store Connect API keys, passwords, or provisioning profiles.

## Release evidence

For every stage, report the marketing version, build number, git commit, Release API host (never credentials), bundle id, archive or upload identifier, checks performed, warnings, and remaining human decisions. A successful upload is not a successful TestFlight distribution; a processed TestFlight build is not an App Review submission; approval is not release unless the selected release mode makes it so.
