# Research basis

This skill was distilled on 2026-08-28 from related GitHub skills, established API guidelines, and LinOnward's current contract. Sources are provenance, not rules that override the repository.

## Related skills reviewed

- [bm629/agent-skills: rest-api-design](https://github.com/bm629/agent-skills/tree/main/skills/rest-api-design) separates contract design from framework implementation and emphasizes resource modeling, HTTP semantics, one error format, pagination, idempotency, evolution, and OpenAPI 3.1.
- [Jeffallan/claude-skills: api-designer](https://github.com/Jeffallan/claude-skills/tree/main/skills/api-designer) contributes a domain-first workflow, explicit compatibility planning, contract validation, and a concrete delivery checklist.
- [zoom/skills: rest-api](https://github.com/zoom/skills/tree/main/skills/rest-api) demonstrates useful progressive disclosure, but its product-specific OAuth, quota, pagination, and identifier rules were not generalized into this skill.
- [chrisbanes/skills: kotlin-api-design](https://github.com/chrisbanes/skills/tree/main/skills/kotlin-api-design) reinforces choosing ownership and domain meaning before introducing public abstractions, though its Kotlin-specific decisions are outside this skill's scope.

## Primary guidance used to verify the synthesis

- [Google API Improvement Proposals](https://github.com/googleapis/aip) for resource-oriented design, standard methods, long-running operations, pagination, filtering, versioning, and declarative-friendly contracts.
- [Microsoft Azure REST API Guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md) for consistent HTTP semantics, retry-safe operations, optimistic concurrency, collections, asynchronous work, and SDK-friendly evolution.
- [Zalando RESTful API Guidelines](https://github.com/zalando/restful-api-guidelines) for API-first review, compatibility, security declarations, standardized errors, pagination, and operational consistency.
- [OpenAPI Specification](https://github.com/OAI/OpenAPI-Specification) for contract representation. OpenAPI 3.1 aligns schemas with modern JSON Schema and should remain the canonical machine-readable description when adopted.

## Deliberate project-specific choices

- LinOnward already exposes one stable custom error envelope with `requestId`. The skill preserves it instead of importing RFC 9457 merely because an external skill prefers Problem Details.
- The repository has no canonical OpenAPI document today. The skill recommends OpenAPI when the project adopts it, but does not create a second source of truth alongside code and runtime schemas without an explicit task.
- API versioning is not prescribed as `/v1`. Version only when compatibility requires it and use one service-wide strategy.
- Fixed page sizes, nesting depth, identifier formats, and rate-limit headers remain contextual choices rather than universal constants.
