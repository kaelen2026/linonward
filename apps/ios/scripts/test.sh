#!/bin/sh

set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
simulator_id=${IOS_SIMULATOR_ID:-}
simulator_family=${IOS_SIMULATOR_FAMILY:-iPhone}

case "$simulator_family" in
  iPhone|iPad) ;;
  *)
    echo "IOS_SIMULATOR_FAMILY must be iPhone or iPad." >&2
    exit 1
    ;;
esac

if [ -z "$simulator_id" ]; then
  simulator_id=$(xcrun simctl list devices available | awk -v family="$simulator_family" '
    index($0, family) {
      for (field = 1; field <= NF; field += 1) {
        if ($field ~ /^\([0-9A-F]{8}-[0-9A-F-]{27}\)$/) {
          gsub(/[()]/, "", $field)
          print $field
          exit
        }
      }
    }
  ')
fi

if [ -z "$simulator_id" ]; then
  echo "No available $simulator_family Simulator found. Set IOS_SIMULATOR_ID to a device UUID." >&2
  exit 1
fi

xcodebuild \
  -project "$project_dir/LinOnward.xcodeproj" \
  -scheme LinOnward \
  -configuration Debug \
  -destination "platform=iOS Simulator,id=$simulator_id" \
  CODE_SIGNING_ALLOWED=NO \
  test
