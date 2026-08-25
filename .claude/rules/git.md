# Git rules

Operating rules for git in this repository. Style reference for humans lives in
[docs/conventions.md](../../docs/conventions.md); this file is what the agent follows.

## Commit only when asked

Never commit, amend, push, tag, or create a PR unless the user asks for it.
Finishing an edit is not a request to commit.

Never run destructive history or worktree commands on your own: no `push --force`,
`reset --hard`, `rebase`, `checkout -- .`, `clean -fd`, `stash drop`,
`worktree remove --force`, or branch deletion. If one of those is the right fix, say so and let the user decide.

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

Husky installs on `pnpm install` via the root `prepare` script — including in a new
worktree, where hooks are absent until you run it (see [Worktrees](#worktrees)).

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

## Worktrees

Do the work in a worktree, not by switching branches in the main checkout. The
main checkout at `linonward/` stays on `main` and stays clean, so a dev server,
a build, or a second task never has the rug pulled out from under it.

Worktrees live **beside** the repository, never inside it — a worktree nested in
the working tree would be swept into `pnpm-workspace.yaml` globs and Biome's file
walk. Name the directory after the branch:

```
workspace/github/kaelen2026/
├── linonward/                     # main checkout — stays on main
├── linonward-pricing-page/        # feat/pricing-page
└── linonward-dark-mode-border/    # fix/dark-mode-border
```

Create one, then install before touching anything:

```bash
git worktree add ../linonward-pricing-page -b feat/pricing-page
cd ../linonward-pricing-page
pnpm install
```

`pnpm install` is **not optional**. A fresh worktree has no `node_modules`, and
`.husky/_` is gitignored so it does not come across either — but `core.hooksPath`
is shared repo config and still points at `.husky/_`. Until `prepare` recreates
that directory, git finds no hooks and **commits skip lint-staged and commitlint
silently, with no error**. Verify with `git config --get core.hooksPath` and a
directory listing if a commit looks suspiciously quiet.

The Turborepo cache, on the other hand, *is* shared. Turbo resolves the
repository root through the `.git` file a worktree carries, so every worktree
reads and writes `linonward/.turbo/cache` in the main checkout — a fresh
worktree gets warm builds for free, and `rm -rf .turbo` from one clears them
for all. What does not come across is `.env*.local`: gitignored, so copy it by
hand if the task needs it.

When the branch is merged or abandoned, remove the worktree — a stale one keeps
its branch checked out and blocks deleting it:

```bash
git worktree list                              # from anywhere in the repo
git worktree remove ../linonward-pricing-page
```

Never `worktree remove --force`, and never remove a worktree you did not create:
it discards uncommitted work in a directory the user may still be using. If a
worktree refuses to go, say why and let the user decide.

## PRs

Only with `gh` and only when asked. Title follows the commit format above. Body:
what changed, why, and how it was verified. End with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### Merging

Merge with **rebase**, so `main` stays close to linear and the individual
Conventional Commits survive:

```bash
gh pr merge <n> --rebase
```

`merge`, `squash` and `rebase` are all enabled on the repo and the choice is
permanent history. Never pick one on your own; ask.

Rebasing rewrites the SHAs, which has a consequence worth knowing *before* you
reach for cleanup: the local branch's commits are no longer ancestors of `main`,
so `git branch -d` reports **"not fully merged"** and refuses. `-D` is required.

Prove nothing is lost first with `git cherry`, which compares **patch ids** and
so sees through the rewritten SHAs:

```bash
git cherry main feat/pricing-page
```

Read the markers, not the presence of output: `-` means that patch is already
upstream, `+` means it is **not**. Only `+` lines block deletion. No `+` lines,
and `-D` discards nothing but stale SHAs.

Do **not** compare trees (`git rev-parse 'branch^{tree}'` against
`'main^{tree}'`) to decide this. It is only equal when nothing else landed on
`main` between the rebase and the check — merge one other PR first and the trees
legitimately differ while the branch is fully merged, which reads as data loss
when it is not.

### Post-merge cleanup

Order matters — a branch still checked out in a worktree cannot be deleted:

1. `git pull --ff-only` in the main checkout, to bring `main` up to the merge
2. `git worktree remove ../linonward-pricing-page`
3. `git push origin --delete feat/pricing-page`
4. `git branch -D feat/pricing-page` — after the `git cherry` check above

The repo does not auto-delete merged branches. Every step here is branch or
worktree deletion, so all of it is the user's call: do it only when asked, never
with `--force`, and never to a worktree you did not create.
