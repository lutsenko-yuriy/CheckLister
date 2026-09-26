#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || -z "$1" ]]; then
  echo 'Usage: npm run scenarios:ios -- <booted-ios-simulator-udid>' >&2
  exit 2
fi

scenarios_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$scenarios_root/scripts/scenarios-ios-common.sh"

scenarios_require_tools node xcrun maestro rsync
scenarios_device="$1"
scenarios_validate_device_and_app "$scenarios_device"

# Scenario assertions are written in English. Pin the simulator's preferred
# language/locale so a developer's non-English simulator (or #80's own
# German/French/Russian testing) still resolves the app to English —
# per-app launch args don't cover the deep-link-triggered relaunches these
# scenarios also exercise (openLink, stopApp), so the pin is device-wide.
xcrun simctl spawn "$scenarios_device" defaults write -g AppleLanguages -array en
xcrun simctl spawn "$scenarios_device" defaults write -g AppleLocale -string en_US

scenarios_artifacts="${SCENARIOS_ARTIFACTS_DIR:-$scenarios_root/artifacts/scenarios-ios}"
mkdir -p "$scenarios_artifacts"
scenarios_output="$(mktemp -d "$scenarios_artifacts/run-XXXXXXXX")"
echo "Scenario artifacts: $scenarios_output"
exec maestro --device "$scenarios_device" test \
  --format junit --output "$scenarios_output/report.xml" \
  --test-output-dir "$scenarios_output" \
  -e "APP_ID=$scenarios_app" --include-tags ios "$scenarios_root/.maestro"
