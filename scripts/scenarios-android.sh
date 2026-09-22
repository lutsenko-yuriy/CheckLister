#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || -z "$1" ]]; then
  echo 'Usage: npm run scenarios:android -- <running-android-emulator-serial>' >&2
  exit 2
fi

scenarios_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
scenarios_serial="$1"
scenarios_app='com.checklister'

scenarios_adb='adb'
if ! command -v "$scenarios_adb" >/dev/null 2>&1; then
  scenarios_adb="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}/platform-tools/adb"
  if [[ -z "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" || ! -x "$scenarios_adb" ]]; then
    echo 'Missing adb. See docs/SCENARIOS.md for setup.' >&2
    exit 1
  fi
fi
if ! command -v maestro >/dev/null 2>&1; then
  echo 'Missing maestro. See docs/SCENARIOS.md for setup.' >&2
  exit 1
fi

if ! "$scenarios_adb" devices | awk -v serial="$scenarios_serial" \
    'BEGIN{found=0} $1==serial && $2=="device"{found=1} END{exit !found}'; then
  echo 'Select a running emulator serial from: adb devices' >&2
  exit 1
fi
if [[ "$scenarios_serial" != emulator-* ]]; then
  echo 'Select a running emulator serial from: adb devices' >&2
  exit 1
fi
if ! "$scenarios_adb" -s "$scenarios_serial" shell pm path "$scenarios_app" >/dev/null 2>&1; then
  echo 'Install CheckLister on the selected emulator first. See docs/SCENARIOS.md.' >&2
  exit 1
fi

scenarios_artifacts="${SCENARIOS_ARTIFACTS_DIR:-$scenarios_root/artifacts/scenarios-android}"
mkdir -p "$scenarios_artifacts"
scenarios_output="$(mktemp -d "$scenarios_artifacts/run-XXXXXXXX")"
echo "Scenario artifacts: $scenarios_output"
exec maestro --device "$scenarios_serial" test \
  --format junit --output "$scenarios_output/report.xml" \
  --test-output-dir "$scenarios_output" \
  -e "APP_ID=$scenarios_app" --include-tags android "$scenarios_root/.maestro"
