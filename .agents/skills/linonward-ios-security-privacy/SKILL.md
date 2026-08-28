---
name: linonward-ios-security-privacy
description: Implement, audit, or troubleshoot security and privacy in the LinOnward iOS app, including authentication, Keychain storage, OAuth PKCE, URLSession, transport policy, sensitive logging, privacy manifests, permissions, and App Store privacy evidence. Use when code handles identity, credentials, personal data, cryptography, device capabilities, third-party SDKs, or privacy declarations.
---

# LinOnward iOS Security and Privacy

## Route by risk

- Read [references/auth-storage.md](references/auth-storage.md) for sessions, Keychain, OAuth, cryptography, or sign-out behavior.
- Read [references/networking.md](references/networking.md) for API requests, URLSession, ATS, redirects, TLS, retries, or logging.
- Read [references/privacy.md](references/privacy.md) for permissions, data collection, third-party SDKs, privacy manifests, or App Store privacy answers.

Trace sensitive data end to end: origin, validation, memory, persistence, transport, logs, backend, deletion, and disclosure. Review the actual app and API behavior; do not infer security from type names or privacy from the absence of an analytics SDK.

## LinOnward invariants

- Native authentication uses bearer tokens and a URLSession configuration that stores no cookies. Reintroducing cookies can trigger Better Auth's browser-origin protections and break the native threat model.
- Session tokens belong in Keychain, never `UserDefaults`, source, plist, logs, screenshots, analytics, or test fixtures committed to Git.
- Google sign-in is authorization code with PKCE inside the app. Generate fresh verifier, state, and nonce values for every attempt, validate the returned state, and never ship a client secret.
- Release API configuration must use the approved production HTTPS origin. Local HTTP exists only for Simulator development and must not become a broad ATS exception.

Report findings with code evidence, impact, realistic attack or privacy consequence, and the smallest verifiable remediation. Do not rotate credentials, revoke sessions, change production identity configuration, or alter App Store declarations without explicit authorization.
