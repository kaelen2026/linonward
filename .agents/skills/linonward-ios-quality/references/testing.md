# Testing strategy

## Choose the test layer

- Put state transitions, validation, request construction, decoding, and error mapping in fast Swift Testing suites under `LinOnwardTests`.
- Test service/model coordination with deterministic fakes for network, Keychain, browser authentication, clocks, and randomness. Assert observable outcomes rather than private implementation details.
- Use XCTest UI tests for launch behavior, localization wiring, focus and keyboard interactions, navigation, accessibility identifiers, and critical user journeys that cannot be proven below the UI.
- Use a live backend only when the contract across processes is the subject. Never make the default test suite depend on production or personal credentials.

Follow the existing parameterized Swift Testing style and test names that explain user behavior. Continue using XCTest for XCUIAutomation; do not mix Swift Testing and XCTest APIs inside one test.

## UI-test stability

- Launch each test into a known state with explicit arguments, locale, and injected test configuration. Do not rely on test order or an account left in the Simulator Keychain.
- Locate controls by stable accessibility identifier, then assert visible labels separately when copy matters. Avoid coordinates and arbitrary sleeps; wait for an expected state with a bounded timeout.
- Capture screenshots or activity attachments on failure when they materially help diagnosis.
- Classify a failure before retrying: app defect, test defect, environment failure, backend dependency, or timing race. Repetition without evidence does not make a flaky test valid.

## Completion

Run the focused suite during iteration, then `pnpm ios:test`. Because that command includes UI tests, report missing Simulator infrastructure separately from test failures. Review coverage by behavior and risk, not percentage alone.
