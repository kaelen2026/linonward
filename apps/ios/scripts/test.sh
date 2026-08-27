#!/bin/sh

set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
simulator_id=${IOS_SIMULATOR_ID:-}

if [ -z "$simulator_id" ]; then
  simulator_id=$(xcrun simctl list devices available | awk -F '[()]' '/iPhone/ { print $2; exit }')
fi

if [ -z "$simulator_id" ]; then
  echo "No available iPhone Simulator found. Set IOS_SIMULATOR_ID to an available device UUID." >&2
  exit 1
fi

xcodebuild \
  -project "$project_dir/LinOnward.xcodeproj" \
  -scheme LinOnward \
  -configuration Debug \
  -destination "platform=iOS Simulator,id=$simulator_id" \
  CODE_SIGNING_ALLOWED=NO \
  test
