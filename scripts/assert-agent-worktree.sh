#!/usr/bin/env bash

set -euo pipefail

target_dir=${1:-.}

if ! repo_root=$(git -C "$target_dir" rev-parse --show-toplevel 2>/dev/null); then
  echo "Worktree check failed: $target_dir is not inside a Git repository." >&2
  exit 1
fi

branch=$(git -C "$repo_root" branch --show-current)
git_dir=$(git -C "$repo_root" rev-parse --path-format=absolute --git-dir)
common_dir=$(git -C "$repo_root" rev-parse --path-format=absolute --git-common-dir)

if [[ "$branch" == "main" ]]; then
  echo "Worktree check failed: agents must not modify the main branch checkout." >&2
  exit 1
fi

if [[ "$git_dir" == "$common_dir" ]]; then
  echo "Branch checkout check passed: $branch in primary checkout $repo_root"
else
  echo "Worktree check passed: $branch in $repo_root"
fi
