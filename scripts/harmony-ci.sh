#!/bin/sh

set -eu

mode=${1:-verify}
repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
app_root="$repo_root/apps/harmony"

: "${HARMONY_CLI_HOME:?Set HARMONY_CLI_HOME to the installed HarmonyOS Command Line Tools directory.}"
: "${DEVECO_SDK_HOME:?Set DEVECO_SDK_HOME to a DevEco/HarmonyOS SDK installation compatible with API 12.}"

node_bin="$HARMONY_CLI_HOME/tool/node/bin/node"
ohpm_bin="$HARMONY_CLI_HOME/bin/ohpm"
codelinter_bin="$HARMONY_CLI_HOME/bin/codelinter"
hvigor_bin="$HARMONY_CLI_HOME/hvigor/bin/hvigorw.js"

for tool in "$node_bin" "$ohpm_bin" "$codelinter_bin" "$hvigor_bin"; do
  if [ ! -e "$tool" ]; then
    echo "Missing HarmonyOS CI tool: $tool" >&2
    exit 1
  fi
done

"$repo_root/scripts/prepare-harmony-profile.sh"

(cd "$app_root" && "$ohpm_bin" install)
(cd "$app_root/entry" && "$ohpm_bin" install)

run_hvigor() {
  (
    cd "$app_root"
    DEVECO_SDK_HOME="$DEVECO_SDK_HOME" "$node_bin" "$hvigor_bin" "$@"
  )
}

case "$mode" in
  verify)
    "$codelinter_bin" "$app_root" -e error
    run_hvigor --mode module -p module=entry@default -p product=default \
      -p requiredDeviceType=phone assembleHap --analyze=normal --parallel --incremental --daemon
    run_hvigor test --daemon
    ;;
  device)
    run_hvigor ohosTest --daemon
    ;;
  *)
    echo "Usage: $0 [verify|device]" >&2
    exit 64
    ;;
esac
