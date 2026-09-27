#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || -z "$1" ]]; then
  echo 'Usage: npm run scenarios:snapshot:android -- <running-android-emulator-serial>' >&2
  exit 2
fi

scenarios_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$scenarios_root/scripts/scenarios-android-common.sh"

scenarios_serial="$1"
scenarios_resolve_adb
scenarios_validate_device_and_app "$scenarios_serial"
scenarios_ensure_root "$scenarios_serial"

# Terminate first so nothing is mid-write while tar reads the container.
"$scenarios_adb" -s "$scenarios_serial" shell am force-stop "$scenarios_app" >/dev/null 2>&1 || true

scenarios_avd_name="$(scenarios_resolve_avd_name "$scenarios_serial")"
scenarios_artifacts="${SCENARIOS_ARTIFACTS_DIR:-$scenarios_root/artifacts/scenarios-android}"
scenarios_snapshot_dir="$scenarios_artifacts/snapshot"
mkdir -p "$scenarios_snapshot_dir"
scenarios_snapshot_tar="$scenarios_snapshot_dir/$scenarios_avd_name.tar"
scenarios_tmp_tar="$(mktemp "$scenarios_snapshot_dir/.$scenarios_avd_name.XXXXXXXX.tar")"
trap 'rm -f "$scenarios_tmp_tar"' EXIT

# cache/code_cache are the Library/Caches analogue: regenerable, irrelevant
# to isolation correctness, and keep the snapshot smaller. lib doesn't
# exist under app-private storage on every API level (CheL-97: confirmed
# absent on API 36 — native libs live under /data/app/.../lib instead), but
# excluding it is harmless where it doesn't exist and correct where it does
# (it would otherwise be a symlink into the install, not the data).
"$scenarios_adb" -s "$scenarios_serial" exec-out tar -c -C "/data/data/$scenarios_app" \
  --exclude ./cache --exclude ./code_cache --exclude ./lib . > "$scenarios_tmp_tar"
mv "$scenarios_tmp_tar" "$scenarios_snapshot_tar"
echo "Captured app data snapshot: $scenarios_snapshot_tar"
