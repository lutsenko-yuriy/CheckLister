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
scenarios_avd_name="$(scenarios_resolve_avd_name "$scenarios_serial")"
scenarios_snapshot_tar="$scenarios_artifacts/snapshot/$scenarios_avd_name.tar"
if [[ -f "$scenarios_snapshot_tar" ]]; then
  echo "Restoring app data from snapshot: $scenarios_snapshot_tar"
  scenarios_ensure_root "$scenarios_serial"
  "$scenarios_adb" -s "$scenarios_serial" shell am force-stop "$scenarios_app" >/dev/null 2>&1 || true
  # Explicit allowlist, not `rm -rf *`, so app_* dirs, cache, code_cache and
  # lib are never touched by restore — the equivalent of iOS's
  # `rsync -a --delete`, without which a record from a failed prior run
  # would survive into the next.
  "$scenarios_adb" -s "$scenarios_serial" shell rm -rf \
    "/data/data/$scenarios_app/files" "/data/data/$scenarios_app/databases" \
    "/data/data/$scenarios_app/shared_prefs" "/data/data/$scenarios_app/no_backup"
  "$scenarios_adb" -s "$scenarios_serial" push "$scenarios_snapshot_tar" /data/local/tmp/scenarios-restore.tar >/dev/null
  "$scenarios_adb" -s "$scenarios_serial" shell tar -x -C "/data/data/$scenarios_app" -f /data/local/tmp/scenarios-restore.tar
  "$scenarios_adb" -s "$scenarios_serial" shell rm /data/local/tmp/scenarios-restore.tar >/dev/null 2>&1 || true
else
  echo 'No snapshot found for this AVD — running without restoring app data. See npm run scenarios:snapshot:android in docs/SCENARIOS.md.'
fi

mkdir -p "$scenarios_artifacts"
scenarios_output="$(mktemp -d "$scenarios_artifacts/run-XXXXXXXX")"
echo "Scenario artifacts: $scenarios_output"
exec maestro --device "$scenarios_serial" test \
  --format junit --output "$scenarios_output/report.xml" \
  --test-output-dir "$scenarios_output" \
  -e "APP_ID=$scenarios_app" --include-tags android "$scenarios_root/.maestro"
