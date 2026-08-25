# Conventions

## Code style

Biome handles both lint and format; there is no ESLint or Prettier here.

- 2-space indent, 100-column lines, LF endings
- Double quotes, semicolons, trailing commas
- Imports are sorted by Biome's assist actions
- Unused imports and variables are errors; `any` is a warning

Config lives in `biome.json`. Editors should use the official Biome extension
with format-on-save.

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org),
enforced by commitlint in the `commit-msg` hook.

```
<type>(<optional scope>): <subject>
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`. Header limit is 100 characters, and so is every
line of the body and footer — a long unwrapped line there fails the hook too.

```
feat(www): add pricing page
fix(www): correct dark-mode border token
chore: bump turborepo to 2.10
```

## Git hooks

Husky installs the hooks on `pnpm install` (via the root `prepare` script).

| Hook | Runs |
| --- | --- |
| `pre-commit` | `lint-staged` → Biome check + autofix on staged files |
| `commit-msg` | `commitlint` against the conventional-commit rules |

Staged-file globs are in `.lintstagedrc.mjs`. Because Biome rewrites files,
`lint-staged` re-stages whatever it fixes.

Bypass in an emergency with `git commit --no-verify` — then fix it in the next
commit.

## Naming

- Workspace packages: `@linonward/<name>`
- React components: `PascalCase` files under `src/components/`
- shadcn/ui primitives keep the CLI's `kebab-case` filenames in
  `src/components/ui/`
