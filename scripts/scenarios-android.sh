#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || -z "$1" ]]; then
  echo 'Usage: npm run scenarios:android -- <running-android-emulator-serial>[,<serial2>,...]' >&2
  exit 2
fi

scenarios_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$scenarios_root/scripts/scenarios-android-common.sh"

scenarios_resolve_adb
scenarios_parse_devices "$1"

for scenarios_serial in "${scenarios_devices[@]}"; do
  scenarios_validate_device_and_app "$scenarios_serial"
done

scenarios_artifacts="${SCENARIOS_ARTIFACTS_DIR:-$scenarios_root/artifacts/scenarios-android}"

# CheL-105: each serial's snapshot is keyed by its own AVD name, and every
# device in a sharded run executes real flows, so each must restore its own
# baseline before Maestro starts on any of them — otherwise CheL-97's
# isolation guarantee would silently apply to only one of N devices.
for scenarios_serial in "${scenarios_devices[@]}"; do
  scenarios_restore_android_snapshot "$scenarios_serial"
done

mkdir -p "$scenarios_artifacts"
scenarios_output="$(mktemp -d "$scenarios_artifacts/run-XXXXXXXX")"
echo "Scenario artifacts: $scenarios_output"

if [[ ${#scenarios_devices[@]} -eq 1 ]]; then
  exec maestro --device "${scenarios_devices[0]}" test \
    --format junit --output "$scenarios_output/report.xml" \
    --test-output-dir "$scenarios_output" \
    -e "APP_ID=$scenarios_app" --include-tags android "$scenarios_root/.maestro"
else
  # CheL-105: --udid takes a comma-separated list; --shard-split derives
  # from the device count rather than being caller-supplied, since there's
  # no meaningful reason to shard N devices into a different number of
  # shards. No --test-output-dir here — a sharded run writes its own
  # per-shard subdirectories under Maestro's output structure instead.
  scenarios_serials="$(IFS=,; echo "${scenarios_devices[*]}")"
  exec maestro test --udid "$scenarios_serials" --shard-split="${#scenarios_devices[@]}" \
    --format junit --output "$scenarios_output/report.xml" \
    -e "APP_ID=$scenarios_app" --include-tags android "$scenarios_root/.maestro"
fi
