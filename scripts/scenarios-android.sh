#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || -z "$1" ]]; then
  echo 'Usage: npm run scenarios:android -- <running-android-emulator-serial>' >&2
  exit 2
fi

scenarios_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$scenarios_root/scripts/scenarios-android-common.sh"

scenarios_serial="$1"
scenarios_resolve_adb
scenarios_validate_device_and_app "$scenarios_serial"

scenarios_artifacts="${SCENARIOS_ARTIFACTS_DIR:-$scenarios_root/artifacts/scenarios-android}"
mkdir -p "$scenarios_artifacts"
scenarios_output="$(mktemp -d "$scenarios_artifacts/run-XXXXXXXX")"
echo "Scenario artifacts: $scenarios_output"
exec maestro --device "$scenarios_serial" test \
  --format junit --output "$scenarios_output/report.xml" \
  --test-output-dir "$scenarios_output" \
  -e "APP_ID=$scenarios_app" --include-tags android "$scenarios_root/.maestro"
