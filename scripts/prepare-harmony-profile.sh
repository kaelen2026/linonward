#!/bin/sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
profile="$repo_root/apps/harmony/build-profile.json5"
template="$repo_root/apps/harmony/build-profile.template.json5"

if [ "${1:-}" = "--check" ]; then
  test -f "$template" || {
    echo "Missing tracked HarmonyOS profile template: $template" >&2
    exit 1
  }
  test -f "$profile" || {
    echo "Missing local HarmonyOS profile. Run scripts/prepare-harmony-profile.sh first." >&2
    exit 1
  }
  exit 0
fi

if [ "$#" -ne 0 ]; then
  echo "Usage: scripts/prepare-harmony-profile.sh [--check]" >&2
  exit 2
fi

if [ -e "$profile" ]; then
  echo "Keeping existing local HarmonyOS profile: $profile"
  exit 0
fi

cp "$template" "$profile"
echo "Created local HarmonyOS profile: $profile"
