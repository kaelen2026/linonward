---
name: integration-resilience
description: Design, implement, review, and verify reliable LinOnward external integrations. Use for Feishu, GitHub Actions, Hermes, Resend, Google, Redis-backed delivery control, webhooks, remote API clients, retries, timeouts, idempotency, deduplication, partial failure, and recovery.
---

# Engineer resilient integrations

Assume every remote call can be slow, fail ambiguously, repeat, or return an unexpected payload. Make delivery semantics and stopping conditions explicit before adding retries.

## Define the interaction

1. Read the vendor boundary, configuration, protocol documentation, current adapter, and tests. Identify which side owns identifiers and retries.
2. Classify the operation as read, idempotent write, conditionally idempotent write, or non-idempotent write. State delivery semantics, duplicate consequences, ordering needs, timeout budget, and acceptable data loss or delay.
3. Keep vendor SDK objects and payloads inside the adapter. Validate untrusted responses and events at the edge and pass minimal domain values inward.

## Bound failure

1. Set connection and overall operation timeouts. Propagate cancellation where supported and keep the total retry budget below the caller's deadline.
2. Retry only transient failures and only when the operation is safe or protected by an idempotency key, stable external identifier, or durable deduplication claim. Use bounded exponential backoff with jitter and honor `Retry-After`.
3. Do not retry validation, authentication, authorization, or other permanent failures. Cap attempts and surface a final classified outcome; never create an infinite retry loop.
4. Treat timeout-after-send as ambiguous. Reconcile by idempotency key or provider status lookup instead of blindly repeating a side effect.
5. Apply concurrency limits and backpressure before adding circuit breakers. Introduce a breaker only when repeated calls to a failing dependency materially worsen recovery, and define half-open behavior.

## Preserve delivery correctness

1. Deduplicate inbound events by stable provider event or message ID before dispatching effects. Make the claim atomic and give it a retention period derived from the provider's retry window.
2. Keep acknowledgements honest: acknowledge acceptance after durable ownership is established, not merely after parsing. Separate accepted, completed, retryable failure, and terminal failure states.
3. Design multi-step effects for partial failure. Prefer durable state and resumable steps; define compensation only when it is safe and semantically correct.
4. Keep secrets scoped to the adapter and never place them in workflow inputs, logs, error bodies, or messages. Validate destinations and allowlists before performing external effects.

## Test failure paths

Use injected clients and deterministic clocks. Cover timeout, transient then success, exhausted retry budget, permanent failure without retry, duplicate delivery, concurrent duplicates, malformed response, rate limit with retry guidance, cancellation, and partial completion where applicable. A happy-path mock alone does not verify resilience.

## Verify and report

Run focused adapter and service tests, affected workspace tests and typecheck, then the repository checks required by `implement-backend`. Report timeouts, retry policy, idempotency and deduplication scope, delivery semantics, failure visibility, and external systems not called. Never send a live message, email, workflow dispatch, or production mutation without explicit authorization.
