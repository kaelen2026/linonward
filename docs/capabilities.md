# Product capability lifecycle

This matrix records intentional product differences between clients. It is an architecture and
release-planning input, not a promise that every client ships every capability simultaneously.

## Support levels

- **Supported** — production behavior, covered by the platform's normal verification gate.
- **Preview** — usable, but its product or protocol may still change compatibly.
- **Planned** — an accepted direction with no compatibility promise or delivery date.
- **Not planned** — deliberately outside that client's role.

## Current matrix

| Capability | API | Public web | Internal web | H5 reader | iOS | Android | HarmonyOS | React Native |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Email OTP authentication | Supported | Not planned | Supported | Not planned | Supported | Supported | Planned | Planned |
| Google authentication | Supported | Not planned | Supported | Not planned | Supported | Planned | Planned | Planned |
| Published article reading | Supported | Planned | Supported | Preview | Preview | Planned | Planned | Planned |
| Article authoring and publishing | Supported | Not planned | Preview | Not planned | Not planned | Not planned | Not planned | Not planned |
| Native reader bridge | Not applicable | Not applicable | Not applicable | Preview | Preview | Planned | Planned | Planned |
| Contact inquiries | Supported | Supported | Not planned | Not planned | Not planned | Not planned | Not planned | Not planned |
| Operational status and telemetry | Supported | Browser tracing | Supported | Not planned | Planned | Planned | Planned | Planned |

Update this table in the same change that adds, removes, or promotes a capability. A capability is
not **Supported** until its owning platform's CI gate covers its important behavior.

## Compatibility policy

- HTTP additions are backward compatible by default. Existing fields keep their meaning and
  required fields are not added to existing client responses without a migration window.
- The OpenAPI document and executable schemas in `packages/contracts` are the application-owned
  HTTP source of truth. Better Auth retains its upstream wildcard contract.
- Native apps must tolerate unknown response fields. The server must retain behavior required by
  every supported app version during the published support window.
- The H5/native bridge negotiates protocol major/minor and capabilities. A major mismatch is
  incompatible; optional behavior must be capability-gated.
- Deprecation requires an owner, an announced replacement, telemetry that can show remaining use,
  and a removal release. Calendar durations remain a product/release decision until distribution
  data is available.
