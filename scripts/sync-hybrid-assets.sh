#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
source_dir="$repo_root/apps/h5/dist"
mode="${1:-sync}"
target="${2:-all}"

ios_dir="$repo_root/apps/ios/LinOnward/Resources/Hybrid/ArticleReader"
android_dir="$repo_root/apps/android/app/src/main/assets/hybrid/article-reader"
harmony_dir="$repo_root/apps/harmony/entry/src/main/resources/rawfile/hybrid/article-reader"

case "$mode" in
  sync | check) ;;
  *)
    echo "Usage: $0 [sync|check] [all|ios|android|harmony]" >&2
    exit 2
    ;;
esac

case "$target" in
  all) target_dirs=("$ios_dir" "$android_dir" "$harmony_dir") ;;
  ios) target_dirs=("$ios_dir") ;;
  android) target_dirs=("$android_dir") ;;
  harmony) target_dirs=("$harmony_dir") ;;
  *)
    echo "Usage: $0 [sync|check] [all|ios|android|harmony]" >&2
    exit 2
    ;;
esac

pnpm --dir "$repo_root" --filter @linonward/h5 build

if [[ ! -f "$source_dir/index.html" ]]; then
  echo "H5 build did not produce index.html" >&2
  exit 1
fi

for target_dir in "${target_dirs[@]}"; do
  if [[ "$mode" == "check" ]]; then
    if ! diff -qr "$source_dir" "$target_dir"; then
      echo "Hybrid assets are stale: ${target_dir#"$repo_root/"}" >&2
      echo "Run pnpm hybrid:sync to refresh all native bundles." >&2
      exit 1
    fi
    continue
  fi

  mkdir -p "$target_dir"
  find "$target_dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -R "$source_dir"/. "$target_dir"/
done

if [[ "$mode" == "check" ]]; then
  echo "Hybrid assets match the current H5 production build."
else
  echo "Hybrid assets synchronized for: $target"
fi
