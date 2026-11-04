#!/usr/bin/env bash
# Builds the scenario Release APK (CheL-147): stubs instead of Firebase, dummy
# Firebase config swapped in for the build and restored on exit. Extra arguments
# go to gradlew (CI passes -PreactNativeArchitectures=x86_64 and friends).
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/scenarios-build-common.sh"
scenarios_require_scenario_flag_unset_or_on
export CHECKLISTER_SCENARIO_BUILD=1

scenarios_swap_firebase_config "$scenarios_build_root/android/app/google-services.json" \
  "$scenarios_build_root/scripts/scenarios/firebase/google-services.json"

(cd "$scenarios_build_root/android" && ./gradlew assembleRelease "$@")

python3 -I "$scenarios_build_root/scripts/ci/check_scenario_bundle.py" \
  "$scenarios_build_root/android/app/build/outputs/apk/release/app-release.apk" --expect present
echo 'Scenario APK: android/app/build/outputs/apk/release/app-release.apk'
