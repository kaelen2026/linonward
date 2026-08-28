# Authentication and storage

- Preserve the separation among pure `AuthenticationState`, injected side effects, and Keychain-backed `SessionTokenStore` so security transitions remain testable.
- Define the token's intended Keychain accessibility and synchronizability from product needs; do not silently broaden access, enable iCloud sync, or require biometrics. Treat `OSStatus` failures explicitly and avoid deleting a valid token on transient read errors.
- Clear local credentials only after the intended sign-out semantics are understood; coordinate server revocation when available and make partial failure visible.
- Bind every OAuth callback to the initiating attempt with exact state validation. Use cryptographically secure randomness, SHA-256 PKCE, an exact redirect URI, one-time verifier/nonce values, and bounded attempt lifetime.
- Use CryptoKit and platform primitives for cryptographic operations. Do not invent ciphers, token formats, certificate pinning, or local encryption without a concrete threat model and recovery plan.

Tests should cover missing, malformed, expired, replayed, mismatched, cancelled, concurrent, and partially failed authentication paths without embedding real tokens or accounts.
