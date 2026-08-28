#!/bin/sh

set -eu

default_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
repo_root=${HARMONY_PROFILE_REPO_ROOT:-$default_root}
active_profile=apps/harmony/build-profile.json5
template=apps/harmony/build-profile.template.json5

cd "$repo_root"

if git cat-file -e ":$active_profile" 2>/dev/null; then
  echo "Refusing tracked local HarmonyOS profile: $active_profile" >&2
  exit 1
fi

if ! git cat-file -e ":$template" 2>/dev/null; then
  echo "Missing tracked HarmonyOS profile template: $template" >&2
  exit 1
fi

if git grep --cached -n -E "(^|[^[:alnum:]_\$])[\"']?(certpath|keyPassword|storeFile|storePassword)[\"']?[[:space:]]*:" -- apps/harmony; then
  echo "Refusing HarmonyOS signing material in the Git index." >&2
  exit 1
fi

tracked_signing_file=$(git ls-files 'apps/harmony/*' | grep -Ei '\.(cer|crt|der|jks|key|keystore|p12|p7b|pem|pfx)$' | head -n 1 || true)
if [ -n "$tracked_signing_file" ]; then
  echo "Refusing tracked HarmonyOS signing file: $tracked_signing_file" >&2
  exit 1
fi

if git show ":$template" | awk '
  function inspect_array(text, closing, content) {
    if (!started) {
      if (text !~ /\[/) return
      sub(/^[^[]*\[/, "", text)
      started = 1
    }
    closing = index(text, "]")
    content = closing ? substr(text, 1, closing - 1) : text
    gsub(/[[:space:]]/, "", content)
    if (content != "") nonempty = 1
    if (closing) in_signing = 0
  }
  /(^|[^[:alnum:]_$])"?signingConfigs"?[[:space:]]*:/ {
    found = 1
    in_signing = 1
    inspect_array($0)
    next
  }
  in_signing { inspect_array($0) }
  END { exit !(found && !nonempty) }
'; then
  :
else
  echo "HarmonyOS profile template must contain an empty signingConfigs array." >&2
  exit 1
fi
