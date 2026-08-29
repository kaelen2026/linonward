#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "$script_dir/.." && pwd)"
release_api_base_url="${LINONWARD_ANDROID_RELEASE_API_BASE_URL:-https://api.ci.invalid}"

"$repository_root/apps/android/gradlew" -p "$repository_root/apps/android" \
  --no-daemon \
  :app:lintDebug \
  :app:testDebugUnitTest \
  :app:assembleDebug \
  :app:assembleRelease \
  -Plinonward.apiBaseUrl.release="$release_api_base_url"
