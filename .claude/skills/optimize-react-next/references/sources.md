# Sources and adaptation notes

Reviewed on 2026-08-28. Use these as detailed references only for the category relevant to the task.

- [vercel-labs/agent-skills: react-best-practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) provides prioritized rules for waterfalls, bundles, server work, client data, rerenders, rendering, and JavaScript hot paths.
- [vercel-labs/agent-skills: composition-patterns](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns) was reviewed for scalable component APIs and React 19 patterns.

This skill keeps the performance hierarchy and progressive-disclosure idea, but does not copy the full compiled rule document. Rules that assume SWR, an LRU cache, `better-all`, or a particular component-library architecture are not defaults here because those dependencies and needs are not established in LinOnward. Composition guidance was not made a separate always-on skill; it should be introduced when component API complexity actually appears.
