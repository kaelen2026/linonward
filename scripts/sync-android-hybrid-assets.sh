#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
source_dir="$repo_root/apps/h5/dist"
target_dir="$repo_root/apps/android/app/src/main/assets/hybrid/article-reader"

pnpm --dir "$repo_root" --filter @linonward/h5 build

if [[ ! -f "$source_dir/index.html" ]]; then
  echo "H5 build did not produce index.html" >&2
  exit 1
fi

mkdir -p "$target_dir"
find "$target_dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -R "$source_dir"/. "$target_dir"/
