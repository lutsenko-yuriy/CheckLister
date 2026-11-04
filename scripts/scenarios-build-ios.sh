#!/usr/bin/env bash
# Builds the scenario Release app for an iOS simulator (CheL-147): stubs instead of
# Firebase, dummy Firebase config swapped in for the build and restored on exit.
set -euo pipefail

if [[ $# -ne 1 || -z "$1" ]]; then
  echo 'Usage: npm run scenarios:build:ios -- <booted-ios-simulator-udid>' >&2
  exit 2
fi

source "$(dirname "${BASH_SOURCE[0]}")/scenarios-build-common.sh"
scenarios_require_scenario_flag_unset_or_on
export CHECKLISTER_SCENARIO_BUILD=1

derived="${SCENARIOS_DERIVED_DATA:-/tmp/checklister-scenarios-build}"
scenarios_swap_firebase_config "$scenarios_build_root/ios/CheckLister/GoogleService-Info.plist" \
  "$scenarios_build_root/scripts/scenarios/firebase/GoogleService-Info.plist"

# Own derived data so a normal build's cached bundle is never reused.
xcodebuild -workspace "$scenarios_build_root/ios/CheckLister.xcworkspace" -scheme CheckLister \
  -configuration Release -sdk iphonesimulator -destination "id=$1" \
  -derivedDataPath "$derived" CODE_SIGNING_ALLOWED=NO build

app="$derived/Build/Products/Release-iphonesimulator/CheckLister.app"
python3 -I "$scenarios_build_root/scripts/ci/check_scenario_bundle.py" "$app/main.jsbundle" --expect present
xcrun simctl install "$1" "$app"
echo "Installed scenario build on $1."
