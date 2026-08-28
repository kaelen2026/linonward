# Privacy

Create a data inventory before changing code or declarations: data type, purpose, source, recipient, linkage to identity, retention, deletion, tracking use, and every first- or third-party component involved.

- Request device permissions only at the point of clear user value, with accurate purpose strings and a usable denied/restricted path. Do not pre-prompt deceptively or block unrelated functionality.
- Inspect every added SDK and transitive binary for data collection, tracking domains, required-reason APIs, signatures, and its own privacy manifest before integration.
- Add or update `PrivacyInfo.xcprivacy` only from observed API/data use and Apple's current approved schema and reasons. With XcodeGen, include it through `project.yml` resources and verify it is present at the app bundle root.
- Generate and inspect Xcode's privacy report for the archive. Reconcile it with backend behavior and App Store Connect answers; the manifest and store disclosure serve different purposes and must both be truthful.
- Minimize data and retention. Redact diagnostics by design and verify screenshots, crash reports, analytics, and support exports cannot capture credentials or unnecessary personal data.

Legal, tracking, encryption/export, and App Store privacy answers remain human decisions. Present evidence and unresolved ambiguity rather than selecting convenient answers.
