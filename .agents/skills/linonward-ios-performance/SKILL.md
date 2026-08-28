---
name: linonward-ios-performance
description: Measure, diagnose, fix, or prevent responsiveness, launch, rendering, CPU, memory, leak, network, battery, crash, or hang problems in the LinOnward iOS app. Use for jank, slow flows, excessive SwiftUI updates, regressions, retain cycles, crash evidence, or performance acceptance; do not use for ordinary compile errors.
---

# LinOnward iOS Performance and Stability

## Establish evidence

Define one reproducible flow, expected outcome, affected device/OS, build configuration, data volume, network conditions, and a measurable symptom. Prefer a physical device and Release-like build for user-facing conclusions; use Simulator captures for fast diagnosis while stating their limits.

Start with code inspection, but distinguish suspicion from measured cause:

- broad observation or environment reads causing SwiftUI invalidation fan-out;
- unstable `ForEach` identity, expensive work in `body`, layout feedback loops, oversized image decoding, or main-actor I/O;
- uncancelled tasks, delegates, closures, timers, notifications, or authentication sessions retaining feature state;
- repeated requests, missing timeouts, unbounded buffering, or retry storms;
- blocking launch work or failure paths that spin rather than settle.

## Select the instrument

- SwiftUI Instrument and Time Profiler: hitches, long view-body work, frequent updates, CPU hotspots, launch or interaction latency.
- Allocations, Leaks, and a `.memgraph`: memory growth and ownership paths. Prove the retaining path; a smaller heap alone is not proof of a fix.
- Network and Energy instruments: repeated transfers, wakeups, background activity, and radio-heavy behavior.
- Organizer or supplied crash/hang reports: symbolicate against the exact archived build before attributing a stack.

Use existing simulator tooling when it can capture logs, screenshots, or focused traces. Do not add a profiling framework or permanent instrumentation dependency without explicit approval; keep temporary wiring isolated and remove it after capture.

## Fix and compare

Apply the smallest change supported by evidence. Preserve behavior, cancellation, state ownership, and accessibility. Re-run the same flow on comparable hardware, OS, build, data, and network conditions; record multiple samples when variance matters.

Report baseline and post-change metrics, artifacts, symbolication completeness, remaining hotspots or leaks, and caveats. Never claim improvement from incomparable Debug/Release, Simulator/device, cold/warm, or different-data runs.
