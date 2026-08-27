---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.mts"
---

# TypeScript rules

These rules apply to every TypeScript workspace. The shared compiler settings live in
`packages/typescript-config/`; extend those presets instead of copying their options into an app.

## Preserve the strict contract

- Keep `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, and `isolatedModules`
  enabled. Fix the code that violates them; do not weaken a workspace config to make an error go
  away.
- Treat values outside the current module — request bodies, environment variables, JSON, database
  rows, and third-party responses — as untrusted. Validate or narrow them before use.
- Prefer `unknown` to `any`. Do not use `as any`, `@ts-ignore`, or a broad type assertion to silence
  an error. If an assertion is unavoidable at a validated boundary, keep it narrow and explain why.
- Do not add non-null assertions for values that can genuinely be absent. Narrow indexed access,
  map lookups, query results, and optional properties before using them.

## Imports and modules

- Use `import type` and `export type` whenever a symbol exists only in the type system;
  `verbatimModuleSyntax` preserves the distinction in emitted code.
- Backend workspaces use `moduleResolution: "NodeNext"`. Keep runtime imports compatible with ESM
  resolution and do not introduce CommonJS-only patterns such as `require`, `module.exports`, or
  `__dirname` without an explicit interoperability need.
- Next.js workspaces use bundler resolution and the local `@/*` alias. Follow the import style of
  the workspace you are editing; do not assume frontend aliases exist in backend packages.
- Import from a package's public entry point. Do not reach through another workspace's `src/` tree
  or couple code to private implementation files.

## Types and API design

- Let TypeScript infer local implementation details. Add explicit types at exported APIs, injected
  dependencies, recursive functions, and boundaries where the contract would otherwise be unclear.
- Model variants with discriminated unions and handle them exhaustively. When a new variant should
  force callers to update, use a `never` exhaustiveness check rather than a permissive fallback.
- Prefer types derived from schemas, constants, and existing domain types over parallel handwritten
  unions. A runtime schema remains authoritative for external input; a TypeScript type alone is not
  validation.
- Use `satisfies` when an object should be checked against a contract without widening its useful
  literal types. Use `as const` only when readonly literal inference is intended.
- Keep casts and validation at system boundaries. Internal code should receive already-narrowed
  values instead of repeating assertions throughout the call graph.

## Next.js generated types

- Preserve generated `PageProps`, `LayoutProps`, and typed `href` checking. They come from
  `.next/types`; they are globals, not imports and not generated files to edit.
- Never replace those helpers with handwritten route parameter types merely to make bare `tsc`
  pass. Both Next.js apps intentionally run `next typegen && tsc --noEmit` in `typecheck`.
- Read the versioned documentation in the app's `node_modules/next/dist/docs/` before changing a
  Next.js API whose signature or behavior is uncertain.

## Verification

- Run the affected workspace's `typecheck` while iterating. Before handoff, run root
  `pnpm typecheck`; use `--force` when a Turbo result may be stale.
- Type checking does not replace behavioral tests. Follow `.claude/rules/tdd.md` when behavior
  changes, and run `pnpm build` when code, routing, configuration, or dependencies affect a build.
