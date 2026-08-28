---
name: api-design
description: Design or review LinOnward HTTP API contracts before implementation. Use for new endpoints, resource and URL modeling, methods and status codes, request and response schemas, errors, pagination, filtering, idempotency, authentication and authorization, rate limits, versioning, deprecation, or breaking-change analysis. Do not use for implementing an already-agreed backend contract; use implement-backend instead.
---

# Design HTTP APIs

Produce a coherent, evolvable contract that fits LinOnward before choosing handler or database mechanics. Prefer the repository's established conventions over generic API style guides. Explain deliberate exceptions.

## Establish the contract

1. Read the affected consumers, `apps/api/README.md`, `docs/architecture.md`, nearby routes and tests, and `packages/contracts` exports. Treat deployed behavior as part of the contract even when it is undocumented.
2. Identify the caller, business capability, authorization boundary, expected scale, retry behavior, and compatibility constraints. Separate client needs from the current database schema.
3. Model domain resources, their lifecycle, stable identifiers, ownership, and relationships before listing endpoints. Prefer plural noun paths and shallow nesting; use an explicit action only when the operation does not map cleanly to resource state or standard HTTP methods.
4. Record important unknowns and assumptions. Do not invent product policy, permissions, retention rules, or consistency guarantees.

## Apply HTTP semantics

1. Choose methods by semantics: `GET` is safe; `PUT` replaces a client-addressed resource; `PATCH` partially updates; `POST` creates server-addressed resources or performs non-CRUD actions; `DELETE` removes.
2. Make retry behavior explicit. Preserve natural idempotency and require a documented idempotency key or equivalent deduplication contract for retryable non-idempotent writes.
3. Match status codes to observable outcomes. Common defaults are `200` for a response body, `201` plus `Location` for creation, `202` for accepted asynchronous work, and `204` for success without a body. Distinguish unauthenticated `401`, unauthorized `403`, absent `404`, state conflict `409`, invalid input, throttling `429` with retry guidance, and dependency or server failures.
4. Specify caching and optimistic concurrency when relevant. Use validators such as ETags and conditional requests instead of silent last-write-wins behavior when concurrent edits matter.

## Shape data and failures

1. Define request, success, and failure schemas together. State required versus optional fields, nullability, formats, limits, defaults, server-owned fields, and examples.
2. Preserve LinOnward's single `{ "error": { "code", "message", "requestId", "details"? } }` failure envelope unless the task explicitly includes a coordinated migration. Keep error codes stable and machine-readable, messages safe for clients, and unexpected internals opaque.
3. Put reusable cross-boundary DTOs, limits, and runtime response schemas in `packages/contracts`; keep Hono types, persistence models, and service behavior out of that package.
4. Paginate every collection that can grow. Prefer opaque cursor pagination for changing or large sets; use offset pagination only when stable random page access is a real requirement. Define page-size defaults and maxima, ordering, filter semantics, and cursor invalidation behavior.
5. Avoid exposing sequential database keys, internal state, secrets, stack traces, or fields the caller is not authorized to observe. Define field-level authorization where object-level permission is insufficient.

## Plan evolution and operations

1. Classify each change as additive, behavior-changing, or breaking from the consumer's perspective. Adding a required input, removing or renaming a field, narrowing accepted values, changing meaning, or changing an outcome's status code can be breaking.
2. Prefer additive evolution and tolerant readers. Introduce explicit versioning only when supported compatibility cannot preserve the existing contract; follow any existing service-wide strategy rather than versioning individual endpoints ad hoc.
3. For deprecation, specify the replacement, communication mechanism, usage observation, sunset date, and post-sunset behavior. Do not remove a contract merely because its implementation has moved.
4. Include authentication scheme, authorization rules, abuse controls, rate-limit scope, audit needs, timeout or long-running-operation behavior, and sensitive-data handling when they apply.
5. Design the contract first in the repository's source of truth. If OpenAPI is introduced or already present, use OpenAPI 3.1, validate it, and generate documentation or clients from it rather than maintaining divergent prose.

## Review before handoff

Check that:

- every operation maps to a named capability and authorization rule;
- methods, status codes, retries, and concurrency semantics agree;
- success and every expected failure have stable schemas and examples;
- pagination, ordering, filtering, limits, and rate-limit recovery are defined where relevant;
- logs and errors do not disclose sensitive or internal data;
- the change has a compatibility and deprecation story;
- consumers can test against the contract without knowing the storage model.

## Deliver

Provide only the artifacts the request needs. For a full proposal, include:

1. assumptions and consumer use cases;
2. resource and authorization model;
3. an endpoint table with method, path, purpose, auth, and outcomes;
4. request, response, error, pagination, and retry contracts;
5. compatibility, deprecation, security, and operational decisions;
6. open questions and implementation acceptance criteria.

Keep implementation details out unless they constrain the public contract. When implementation is requested after agreement, hand the contract to `implement-backend` and preserve its decisions in route and service tests.

For the research basis and guidance conflicts considered while creating this skill, read [references/sources.md](references/sources.md).
