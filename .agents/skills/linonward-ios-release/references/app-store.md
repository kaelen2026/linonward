# App Store submission and release

## Submission readiness

Before attaching the tested build, inspect the current App Store Connect version record and identify missing items:

- localized app name, subtitle, description, keywords, promotional text, support URL, marketing URL if used, and privacy-policy URL;
- screenshots for every currently required device class and locale, plus app previews only when intentionally provided;
- primary and secondary categories, age-rating answers, content rights, pricing, territories, and availability;
- App Privacy answers grounded in the app and backend's actual data collection, retention, linkage, tracking, and third-party SDK behavior;
- export-compliance/encryption answers, review contact, review notes, and a working review account or instructions when authentication blocks evaluation.

Do not infer answers from the absence of code in `apps/ios` alone: the production API and enabled third-party services are part of the product's data behavior.

## Review submission

Confirm the exact version/build and show unresolved warnings and human-owned answers before requesting authorization. With explicit approval, attach the tested build, complete the required declarations, and submit it to App Review. Record the submission identifier, timestamp, and selected release mode.

If rejected, quote only the necessary review issue, map it to reproducible product or metadata evidence, and propose the smallest compliant correction. Do not resubmit until the correction is verified and the user authorizes resubmission.

## Release control

Distinguish these choices before submission:

- manual release after approval;
- automatic release immediately after approval;
- automatic release no earlier than an approved date;
- phased release, when currently offered and appropriate.

Selecting or changing the release mode and releasing an approved version affect customers and require explicit authorization. After release, verify storefront availability separately from App Review status, then monitor crash reports, launch health, authentication, backend compatibility, and user feedback. Preserve the released build's commit, version, build number, and archive traceability for rollback or follow-up fixes.
