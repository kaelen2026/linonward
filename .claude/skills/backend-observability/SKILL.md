---
name: backend-observability
description: Design, implement, review, and verify LinOnward backend observability. Use for structured logs, request and correlation IDs, metrics, health and readiness checks, audit events, tracing, alert signals, failure diagnostics, and sensitive-data redaction in apps/api or apps/feishu.
---

# Engineer backend observability

Add telemetry that answers an operational question without exposing user data or creating unbounded cost. Instrument behavior at stable boundaries rather than scattering ad hoc logs.

## Start from the question

1. Read current request-ID, health, startup, error, and integration logging behavior plus deployment topology.
2. State the question the signal must answer, its owner, expected action, retention need, and cardinality. Do not add a metric or log merely because a code path exists.
3. Choose the smallest suitable signal: logs explain individual events, metrics show aggregate behavior, traces connect latency across boundaries, and audit events record security-relevant actions.

## Structure and correlate

1. Use stable event names and structured fields. Include service, environment, version, outcome, duration, and request or correlation ID when applicable.
2. Preserve Hono's request ID through service and outbound adapter boundaries. Accept an external correlation ID only after validation; retain the locally generated ID as the trusted diagnostic key.
3. Record errors once at the boundary that owns handling. Preserve the cause internally, classify the dependency and outcome, and keep client responses opaque.
4. Never log authorization headers, cookies, secrets, OTPs, OAuth artifacts, message bodies, contact messages, or full personal identifiers. Prefer internal actor IDs and deliberate redaction or hashing when correlation is required.

## Measure service behavior

1. For HTTP paths, prefer low-cardinality RED signals: request rate, error rate, and duration grouped by normalized route, method, and status class. Never label metrics with raw URLs, IDs, emails, request IDs, or arbitrary error messages.
2. Measure dependency duration, timeout, retry, throttling, deduplication, and terminal failure at adapter boundaries. Distinguish caller errors from service and dependency faults.
3. Keep liveness limited to whether the process can serve. Readiness may check required dependencies and must fail when production cannot safely handle traffic. Optional local fallbacks must not make production readiness falsely green.
4. Audit privileged grants, revocations, protected reads, and external mutations with actor, action, target identifier, outcome, time, and request ID. Audit events are append-oriented security records, not verbose debug logs.

## Make signals actionable

1. Define thresholds from user impact and known capacity. Alerts need an owner, severity, runbook action, and recovery condition; avoid paging on a single expected failure.
2. Keep dashboards and queries consistent with emitted field names. Treat telemetry schema changes as compatibility changes for operational consumers.
3. Bound volume and cost with sampling or aggregation, but never sample away security audit events or rare terminal failures without an explicit policy.

## Verify and report

Test observable telemetry at the boundary: event name, safe fields, correlation propagation, outcome classification, and absence of sensitive values. Avoid brittle assertions over whole serialized log lines. Run focused tests and the repository checks required by `implement-backend`. Report which operational questions are now answerable, cardinality and privacy decisions, and any dashboard, alert, or collector configuration not exercised.
