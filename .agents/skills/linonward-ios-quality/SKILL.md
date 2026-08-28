---
name: linonward-ios-quality
description: Design, add, review, or run quality checks for the LinOnward iOS app across Swift Testing, XCTest UI automation, accessibility, localization, and device coverage. Use for test strategy, regression coverage, flaky UI tests, VoiceOver or Dynamic Type audits, bilingual copy verification, or pre-release acceptance; use linonward-ios-build-test for build-only failures.
---

# LinOnward iOS Quality

## Route the quality task

- Read [references/testing.md](references/testing.md) for coverage design, Swift Testing, XCTest UI tests, test doubles, or flake diagnosis.
- Read [references/accessibility.md](references/accessibility.md) for VoiceOver, Dynamic Type, contrast, motion, interaction, or accessibility audits.
- Read [references/localization.md](references/localization.md) for String Catalog changes, English/Chinese behavior, layout expansion, or locale-specific UI tests.

Start from the changed user behavior and its failure risk. Add the lowest test layer that can prove it, then add UI coverage only when the behavior depends on the rendered app or system integration.

## Project acceptance baseline

- Unit and integration logic belongs in `LinOnwardTests` using Swift Testing. UI journeys belong in `LinOnwardUITests` using XCTest/XCUIAutomation.
- Keep stable accessibility identifiers independent of displayed copy. Existing identifiers such as `signIn.title` and `signIn.submit` are contracts for automation and should not be renamed casually.
- The app supports English and Simplified Chinese on iPhone and iPad. A feature is incomplete when only one locale or one size class is usable.
- Keep backend-dependent logic behind injected seams so most tests do not need a live API. Reserve true end-to-end tests for a separately configured environment with explicit test accounts.

## Report evidence

State which layers ran, the simulator/device and locale matrix, passed and skipped tests, accessibility findings, and remaining untested risk. Do not equate compilation, snapshots, or a single happy-path UI run with acceptance.
