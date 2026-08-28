---
name: optimize-react-next
description: Prevent and diagnose meaningful React and Next.js performance problems in LinOnward frontends. Use for data-fetching changes, server/client boundaries, slow rendering, large bundles, repeated rerenders, or an explicit performance review; do not apply speculative micro-optimizations to ordinary edits.
---

# Optimize React and Next.js

Optimize from evidence and architecture before syntax. Read the applicable installed Next.js documentation and inspect the actual route, component boundary, dependency, and data flow. Preserve correctness, accessibility, route typing, and repository conventions.

## Priority order

1. **Eliminate request waterfalls.** Start independent work together and await it at the latest point that needs the result. Use route or component structure and Suspense only when they improve real streaming behavior.
2. **Keep code and data off the client.** Default to server components, make client boundaries small, avoid passing large serialized objects, and load heavy optional features only when activated.
3. **Control bundle cost.** Prefer direct analyzable imports. Before adding a dependency or dynamic import, inspect whether it changes the shipped path and whether the feature is actually heavy or optional.
4. **Reduce unnecessary work.** Derive values during render, move interaction logic into event handlers, avoid redundant effects and duplicated subscriptions, and keep frequently changing state close to the consumers that need it.
5. **Improve rendering only where scale warrants it.** Consider `content-visibility`, list virtualization, stable props, or memoization after identifying expensive repeated work. Do not memoize trivial expressions or components by reflex.
6. **Use low-level JavaScript tuning last.** Maps, Sets, loop fusion, cached lookups, and similar changes need a repeated or measured hot path.

## Next.js and React constraints

- Do not invent a caching, rendering, or routing API from memory; consult the version installed in the target app.
- Treat Server Actions and route handlers as security boundaries as well as performance surfaces.
- Avoid module-level mutable request state.
- Prefer platform and framework primitives for images, fonts, scripts, and resource hints when the installed version supports the required behavior.
- Do not add a client boundary merely to make a test convenient.

## Verification

State the suspected bottleneck and the expected observable improvement before changing code. Use available build output, bundle evidence, React profiling, browser traces, or a reproducible timing when the task calls for optimization. Run normal repository verification afterward and distinguish measured gains from reasoned preventive changes.

For detailed upstream rules, consult only the relevant category linked in [references/sources.md](references/sources.md); do not load an entire compiled rule corpus by default.
