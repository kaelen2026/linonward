# Git rules

Operating rules for git in this repository. Style reference for humans lives in
[docs/conventions.md](../../docs/conventions.md); this file is what the agent follows.

## Commit only when asked

Never commit, amend, push, tag, or create a PR unless the user asks for it.
Finishing an edit is not a request to commit.

Never run destructive history or worktree commands on your own: no `push --force`,
`reset --hard`, `rebase`, `checkout -- .`, `clean -fd`, `stash drop`,
`worktree remove --force`, or branch deletion. If one of those is the right fix,
say so and let the user decide.

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
- Body and footer — every line 100 characters max, and that is an **error**, not
  a warning. A pasted URL or error string left on one long line fails the hook.

```
feat(www): add pricing page
fix(www): correct dark-mode border token
chore: bump turborepo to 2.10
docs: document the shadcn workflow
```

Body is optional; use it for the *why*. Close issues with a `Closes #123` footer.

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
expected. It also means the commit you got may not be the diff you reviewed —
confirm with `git show --stat HEAD` before reporting the change as done.
Markdown, YAML, and MDX have no staged-file hook.

Do not pass `--no-verify`. If a hook fails, fix the cause: `pnpm lint:fix` for
Biome findings, or reword the message for commitlint. Bypassing is the user's
call, not yours.

## Before committing

For any non-trivial change, verify first and report real output:

```bash
pnpm lint
pnpm typecheck
```

Add `pnpm build` for anything touching the build.
If any of them fails, fix it or say plainly that it fails — do not commit over
red and call it done.

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

Before creating a worktree, synchronize the clean primary `main` checkout with
`origin/main`. Agents use the guarded entry point, which fetches, permits only a
fast-forward, refuses dirty/ahead/diverged states, verifies equality, and then
creates the worktree:

```bash
scripts/create-agent-worktree.sh codex/pricing-page ../linonward-pricing-page
cd ../linonward-pricing-page
pnpm install
scripts/assert-agent-worktree.sh
```

Do not stash, reset, merge a divergence, or discard local changes to make the
guard pass. Resolve the primary checkout state explicitly before starting new
work. Humans creating worktrees manually must enforce the same clean,
fast-forward-only synchronization sequence.

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

After a PR is confirmed merged, clean up its worktree and branch using the
post-merge procedure below — a stale worktree keeps its branch checked out and
blocks deleting it. For an abandoned branch, cleanup remains the user's call:

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

Do not use `gh pr merge --auto` or otherwise enable auto-merge. An automated review check can turn
green before its review summary and inline comments are visible, allowing GitHub to merge before
the findings have been read.

Check CI and automated review first — the PR gate is the reason this flow exists, and `commitlint`
runs in CI only on `pull_request`, so a PR is the only place it sees the branch:

```bash
gh pr checks <n>
```

Anything red or still running means not yet; `gh run view --log-failed` for the failure. Never merge
over a failing check. After every check, including the automated pull-request review, completes:

1. Read the automated review summary and every inline review comment.
2. Resolve every blocking or correctness finding before merging.
3. Push fixes and wait for the complete CI and automated-review cycle on the new head commit.
4. Re-read the new review output; an earlier review does not approve a later commit.

Only when the final head commit has green CI, a completed automated review, and no unresolved
blocking or correctness findings may the PR be merged. A check conclusion alone is not sufficient
evidence that its review output has been inspected.

Then merge with **squash**, so each PR lands on `main` as exactly one commit:

```bash
gh pr merge <n> --squash
```

Do not pass `--delete-branch`: clean up after GitHub confirms the merge, in the
order below, so the checked-out worktree does not block local branch deletion.

`merge`, `squash` and `rebase` are all enabled on the repo and the choice is
permanent history. Switching away from squash is the user's call; never pick a
different strategy on your own.

Squash means the branch's own commits never reach `main` — they are review-time
structure only. The repo is set to `COMMIT_OR_PR_TITLE` / `COMMIT_MESSAGES`, so
*which* text becomes the permanent commit depends on how many commits the branch
carries. Check that before polishing the wrong thing:

- **One commit** — its subject and body are used verbatim and the **PR title is
  ignored**. The commit message is what to get right; a good PR title will not
  rescue a bad commit subject. This is the common case here.
- **More than one** — the **PR title** becomes the subject, so it has to stand
  on its own under the rules above, and the body is every commit message
  concatenated. Fix the title before merging rather than after, trim the body to
  the *why*, and leave **one** `Co-Authored-By` trailer instead of the N copies
  the concatenation produces.

The squash is a new SHA over a combined diff, so the branch's commits are not
ancestors of `main`: `git branch -d` reports **"not fully merged"** and refuses.
`-D` is required.

Two local checks look like they would clear that, and neither works here:

- `git cherry main feat/pricing-page` compares **patch ids**, and a squash has
  no patch to match. N commits collapsed into one produce a single combined
  patch id that equals none of theirs, so every commit comes back `+` ("not
  upstream") on any branch longer than one commit. It is right about the patch
  ids and wrong about the question.
- Reverse-applying the branch's net diff
  (`git diff main...feat/pricing-page | git apply --reverse --check -`) fails as
  soon as a later commit on `main` touched lines near yours — which happens
  routinely in this repo — so a failure says nothing either way.

Ask GitHub, which performed the squash and is the authority on whether it
landed:

```bash
gh pr view <n> --json state,mergedAt,mergeCommit
```

`state: MERGED` with a `mergeCommit` SHA is the proof, and `-D` then discards
nothing but the pre-squash SHAs. To see that commit locally, grep `main` for the
PR number GitHub appends to the subject:

```bash
git log main --oneline --grep='(#<n>)'
```

Do **not** compare trees (`git rev-parse 'branch^{tree}'` against
`'main^{tree}'`) to decide this. It is only equal when nothing else landed on
`main` between the merge and the check — merge one other PR first and the trees
legitimately differ while the branch is fully merged, which reads as data loss
when it is not.

### Post-merge synchronization and cleanup

After GitHub confirms a merge, first synchronize the main checkout with
`origin/main` and verify it is current:

```bash
git fetch origin main
git pull --ff-only origin main
git rev-list --left-right --count main...origin/main # must output: 0 0
```

Then clean up in this order — a branch still checked out in a worktree cannot
be deleted:

1. `git worktree remove ../linonward-pricing-page`
2. `git push origin --delete feat/pricing-page`
3. `git branch -D feat/pricing-page` — after the `gh pr view` check above

Run this cleanup after every confirmed merge. It applies only to the worktree
created for the merged branch. Never use `--force`; if the worktree has
uncommitted changes or cannot be removed cleanly, stop and report the condition
to the user rather than deleting anything.
