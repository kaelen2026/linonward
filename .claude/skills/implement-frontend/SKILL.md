---
name: implement-frontend
description: Implement and verify frontend changes in LinOnward's apps/www or apps/web Next.js applications. Use for pages, layouts, components, styling, responsive behavior, accessibility, localization, forms, client interactions, and frontend unit or end-to-end tests.
---

# Implement frontend changes

## Establish scope

1. Identify whether the task targets the bilingual official site (`apps/www`), the internal console (`apps/web`), or both.
2. Read the target app's instructions, package scripts, nearby implementation, and nearby tests.
3. Read the relevant installed Next.js guide before relying on a framework API or convention.
4. Inspect `git status` and preserve unrelated work.

## Plan behavior

1. Define the observable behavior and acceptance criteria.
2. Identify locale, accessibility, responsive, loading, empty, error, and dark-mode implications that actually apply.
3. Keep API, database, and integration work outside scope unless explicitly delegated. State the required contract when another domain must change.

## Implement with tests

1. Follow `.claude/rules/tdd.md`: demonstrate a meaningful failing test before implementation when behavior changes.
2. Prefer Vitest for logic and component contracts. Use Playwright only for behavior requiring a built browser application.
3. Match existing component, content, styling, and server/client-boundary patterns.
4. Make the smallest coherent change that satisfies the behavior; avoid speculative abstractions.

## Verify

1. Run focused tests during the red-green-refactor loop.
2. Run the affected workspace test and typecheck commands.
3. Run root `pnpm lint`, `pnpm typecheck`, and `pnpm test` before handoff.
4. Add root `pnpm build` for application code, dependency, configuration, routing, or other build-affecting changes.
5. Inspect the final diff for generated output, accidental scope expansion, hardcoded copy, and missing locale changes.

## Report

Describe the delivered behavior, the important implementation decisions, exact verification results, and any remaining risk or unverified condition. Do not commit unless the user explicitly requests it.
