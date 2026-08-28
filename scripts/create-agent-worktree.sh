#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 codex/<task-name> <sibling-worktree-path>" >&2
  exit 2
fi

branch=$1
worktree_path=$2

if [[ "$branch" != codex/* || "$branch" == "codex/" ]]; then
  echo "Worktree creation failed: branch must match codex/<task-name>." >&2
  exit 1
fi

if [[ -e "$worktree_path" ]]; then
  echo "Worktree creation failed: target already exists: $worktree_path" >&2
  exit 1
fi

primary_root=$(git worktree list --porcelain | awk '/^worktree / { sub(/^worktree /, ""); print; exit }')

if [[ -z "$primary_root" ]]; then
  echo "Worktree creation failed: unable to locate the primary checkout." >&2
  exit 1
fi

if [[ $(git -C "$primary_root" branch --show-current) != "main" ]]; then
  echo "Worktree creation failed: the primary checkout must remain on main." >&2
  exit 1
fi

if [[ -n $(git -C "$primary_root" status --porcelain) ]]; then
  echo "Worktree creation failed: the primary checkout has uncommitted changes." >&2
  git -C "$primary_root" status --short >&2
  exit 1
fi

git -C "$primary_root" fetch origin main

local_main=$(git -C "$primary_root" rev-parse main)
remote_main=$(git -C "$primary_root" rev-parse origin/main)

if [[ "$local_main" != "$remote_main" ]]; then
  if git -C "$primary_root" merge-base --is-ancestor "$local_main" "$remote_main"; then
    git -C "$primary_root" merge --ff-only origin/main
  else
    echo "Worktree creation failed: local main is ahead of or diverged from origin/main." >&2
    exit 1
  fi
fi

local_main=$(git -C "$primary_root" rev-parse main)
remote_main=$(git -C "$primary_root" rev-parse origin/main)

if [[ "$local_main" != "$remote_main" ]]; then
  echo "Worktree creation failed: main does not match origin/main after synchronization." >&2
  exit 1
fi

git -C "$primary_root" worktree add "$worktree_path" -b "$branch" main
echo "Created $branch at $worktree_path from synchronized main $local_main"
