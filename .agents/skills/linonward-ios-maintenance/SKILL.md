---
name: linonward-ios-maintenance
description: Plan, implement, or verify LinOnward iOS maintenance involving Xcode, Swift language mode, iOS deployment targets, XcodeGen, Apple SDK changes, Swift packages, deprecations, build settings, or generated project drift. Use for toolchain and dependency upgrades or migration work; do not use for ordinary feature implementation.
---

# LinOnward iOS Maintenance

## Inventory before changing versions

Read `README.md`, `apps/ios/README.md`, `apps/ios/project.yml`, `Config/*.xcconfig`, CI's iOS job, and the generated project's shared scheme. Record the current Xcode, Swift, XcodeGen, deployment target, available SDK/runtime, warnings, and package graph.

Verify current release notes and migration guidance from Apple or the dependency's primary repository. Do not rely on remembered APIs, copy a version from a blog, or upgrade unrelated tools in the same change.

## Preserve sources of truth

- Change targets, packages, source/resource membership, capabilities, and project settings in `project.yml`, then run `pnpm ios:generate`. Never hand-maintain `project.pbxproj`.
- Keep shared compiler and version settings in `Config/Base.xcconfig`; configuration-specific values stay in Debug or Release files.
- Add Swift packages through XcodeGen's package and target dependency declarations. Pin with a deliberate policy supported by upstream release and security information; inspect transitive products, licenses, privacy manifests, minimum OS, and signing impact.
- Update README, CI, and developer prerequisites when the supported toolchain contract changes.

## Migrate narrowly

Separate mechanical compatibility changes from behavioral redesign. Enable stricter Swift concurrency or new language modes only after classifying diagnostics and preserving actor isolation, cancellation, and `Sendable` correctness; do not silence warnings with unchecked annotations without evidence.

For deployment-target changes, inventory affected users and every API fallback before raising the minimum. For deprecations, use the newest API supported by the approved deployment target and test behavior, not compilation alone.

## Verify

1. Regenerate and confirm a second generation produces no diff.
2. Review the generated project diff for target membership, settings, build phases, schemes, and unintended signing changes.
3. Run focused migrated tests, `pnpm ios:build`, and `pnpm ios:test` on the supported runtime matrix.
4. Run repository-wide checks required by `AGENTS.md` and, for a release-affecting upgrade, execute the readiness checks in `$linonward-ios-release`.

Report old and new versions, primary-source rationale, generated changes, warnings introduced or removed, tested runtimes, rollback considerations, and known follow-up work.
