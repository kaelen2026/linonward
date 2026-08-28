# Networking

- Construct requests from the configured base URL through the existing request factory; validate scheme and host and preserve any approved path prefix.
- Send credentials only to the intended HTTPS origin and after redirect policy is understood. Never log authorization headers, tokens, OTPs, OAuth codes, nonces, full personal payloads, or unredacted response bodies.
- Keep cookie storage disabled for the authentication client. Avoid shared global URLSession state that can inherit cookies, caches, credentials, or delegates from unrelated traffic.
- Model transport errors, timeouts, cancellation, HTTP status, decoding failures, and retryability separately. Retry only idempotent or explicitly safe operations with bounded backoff; OTP sends and sign-in attempts must not duplicate silently.
- Keep the development localhost ATS allowance narrow. Any production exception, trust override, or certificate pinning requires a documented threat model, expiry/rotation plan, and failure recovery.

Validate client assumptions against `apps/api` contracts and tests. The server remains authoritative for authentication, authorization, rate limits, and input validation.
