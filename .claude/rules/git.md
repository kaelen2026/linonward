# Git rules

Operating rules for git in this repository. Style reference for humans lives in
[docs/conventions.md](../../docs/conventions.md); this file is what the agent follows.

## Commit only when asked

Never commit, amend, push, tag, or create a PR unless the user asks for it.
Finishing an edit is not a request to commit.

Never run destructive history or worktree commands on your own: no `push --force`,
`reset --hard`, `rebase`, `checkout -- .`, `clean -fd`, `stash drop`, or branch
deletion. If one of those is the right fix, say so and let the user decide.

## Commit message format

Conventional Commits, enforced by commitlint in the `commit-msg` hook:

```
<type>(<scope>): <subject>
```

- Types — only these: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
  `build`, `ci`, `chore`, `revert`. Anything else fails the hook.
- Scope — optional; the workspace touched, without the `@linonward/` prefix
  (`www`, `typescript-config`). Omit it for root/repo-wide changes.
- Header — 100 characters max, including type and scope.
- Subject — imperative mood, no trailing period. Case is unchecked.

```
feat(www): add pricing page
fix(www): correct dark-mode border token
chore: bump turborepo to 2.10
docs: document the shadcn workflow
```

Body is optional; use it for the *why*, wrapped at 100 columns. Close issues with
a `Closes #123` footer.

End every commit message you author with:

```
Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

## Scope of a commit

One logical change per commit. Stage paths explicitly — `git add <path>` — never
`git add -A` or `git add .`, which sweep up unrelated work in a repo that is
often dirty.

Before staging, run `git status` and `git diff` and check that everything you are
about to include belongs to this change. Leave unrelated modified files alone.

Never commit: `.env` / `.env*.local`, credentials or tokens, `node_modules/`,
build output (`.next/`, `dist/`, `build/`, `out/`), `.turbo/`, `coverage/`, or
`*.log`. `.gitignore` covers these — if something ignored needs committing, ask
first rather than using `-f`.

## Hooks

Husky installs on `pnpm install` via the root `prepare` script.

| Hook | Runs |
| --- | --- |
| `pre-commit` | `lint-staged` → `biome check --write` on staged JS/TS/JSON/CSS |
| `commit-msg` | `commitlint` against the rules above |

Biome rewrites files in place, so a commit can change what you staged; that is
expected. Markdown, YAML, and MDX have no staged-file hook.

Do not pass `--no-verify`. If a hook fails, fix the cause: `pnpm lint:fix` for
Biome findings, or reword the message for commitlint. Bypassing is the user's
call, not yours.

## Before committing

For any non-trivial change, verify first and report real output:

```bash
pnpm lint
pnpm typecheck
```

If either fails, fix it or say plainly that it fails — do not commit over red and
call it done.

## Branches

`main` is the default and the PR base. For anything more than a trivial fix,
branch first:

```
<type>/<short-kebab-summary>      # feat/pricing-page, fix/dark-mode-border
```

Use the same type vocabulary as commits. Never force-push a shared branch.

## PRs

Only with `gh` and only when asked. Title follows the commit format above. Body:
what changed, why, and how it was verified. End with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
