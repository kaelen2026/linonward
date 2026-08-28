---
name: auth-authorization
description: Design, implement, review, and verify LinOnward authentication and authorization. Use for Better Auth sessions, cookies, OAuth, OTP, roles, permissions, protected API operations, admin access, account linking, and 401/403 behavior across apps/api, apps/web, and apps/ios.
---

# Engineer authentication and authorization

Establish identity, then enforce capability at the protected operation. Frontend visibility is never authorization, and authentication alone never grants access.

## Model the trust boundary

1. Read the existing Better Auth configuration, accepted origins and audiences, session contract, protected caller, and nearby tests before changing behavior.
2. Identify the actor, credential, issuer, audience, authentication channel, requested capability, protected resource, and authoritative permission source.
3. Separate authentication failures from authorization failures: invalid or absent credentials return `401`; an authenticated actor without permission returns `403`. Avoid existence leaks when hiding a resource is part of policy.
4. Prefer named capabilities such as `inquiries:read` over route-local role checks. Roles may group capabilities, but operations authorize capabilities. Default to deny when identity or policy data is unavailable.

## Protect credentials and sessions

1. Use the existing Better Auth mechanisms instead of inventing tokens. Keep session cookies `HttpOnly`, `Secure` in production, narrowly scoped, and protected with an intentional `SameSite` and CSRF strategy.
2. Validate OAuth issuer, audience, state, nonce, redirect URI, and PKCE as applicable. Preserve LinOnward's separate Web and iOS clients and never accept an ID token for an unconfigured audience.
3. Store OTPs and reset tokens only in non-recoverable form, bound attempts and lifetime, and make responses resistant to account enumeration.
4. Define permission revocation semantics. Decide whether revocation invalidates active sessions immediately or at the next authoritative check; do not let stale session payloads silently retain elevated access.
5. Never log cookies, authorization headers, OAuth codes, OTPs, refresh tokens, raw ID tokens, or authentication database secrets.

## Enforce authorization

1. Authorize server-side before reading or mutating protected data. Apply object- and field-level checks when collection-level permission is insufficient.
2. Keep the policy decision testable and separate from Hono or Better Auth transport mechanics. Route middleware may extract identity, but domain operations receive only the minimal actor and capability context they need.
3. Use one authoritative source for administrator or role assignment. Do not rely on frontend flags, display names, unchecked claims, or scattered email allowlists.
4. Audit privileged grants, revocations, and sensitive reads with actor, capability, target, outcome, time, and request ID while excluding protected payload content.

## Test the matrix

Cover anonymous, malformed credential, expired session, authenticated without permission, authorized, revoked, disabled, wrong OAuth audience, and dependency-failure cases that apply. Assert both status and the existing API error envelope, and prove protected behavior is never invoked after denial.

## Verify and report

Run focused auth and route tests, affected workspace tests and typecheck, then the repository checks required by `implement-backend`. Report the identity source, permission source, session and revocation semantics, security-sensitive configuration, and any OAuth or email flow not exercised live. Do not weaken production checks to make local verification convenient.
