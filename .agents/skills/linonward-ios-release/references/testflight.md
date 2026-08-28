# TestFlight

## Upload and processing

Confirm explicit authorization before uploading. Upload the validated archive through Xcode Organizer, Transporter, or an already-configured authenticated automation path. Do not create or expose credentials merely to automate a one-off upload.

After upload, verify App Store Connect associated the build with `com.linonward.app` and the intended version/build. Processing is asynchronous; report the processing state and any compliance prompt rather than claiming availability immediately.

## Internal testing

- Confirm the intended internal group and build before changing access. Internal testers are App Store Connect users, so adding or removing them is an account mutation.
- Provide concise “What to Test” notes tied to the changed behavior, known limitations, required test accounts, and feedback focus. Never put production secrets in test notes.
- Exercise install, clean launch, upgrade from the previous build when applicable, email authentication, optional Google authentication, session restoration, logout, offline/error states, and both iPhone and iPad layouts.

## External testing

- Confirm the external group, tester criteria or public-link policy, beta description, feedback email, review contact, and Beta App Review notes.
- The first external build or materially changed beta may require Beta App Review. Submission to that review is an external mutation requiring explicit authorization.
- Provide review credentials only through App Store Connect's protected fields and only when the responsible owner supplies them. Do not store them in the repository or chat output.

## Exit criteria

Summarize tester coverage, OS/device spread, crashes, hangs, authentication failures, feedback themes, and unresolved release blockers. Promote the exact tested build to App Review only after the user accepts the beta outcome; do not rebuild silently between approval and submission.
