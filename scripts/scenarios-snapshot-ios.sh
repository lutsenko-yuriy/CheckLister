#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || -z "$1" ]]; then
  echo 'Usage: npm run scenarios:snapshot:ios -- <booted-ios-simulator-udid>' >&2
  exit 2
fi

scenarios_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$scenarios_root/scripts/scenarios-ios-common.sh"

scenarios_require_tools xcrun node rsync
scenarios_device="$1"
scenarios_validate_device_and_app "$scenarios_device"

# Terminate first so nothing is mid-write while rsync reads the container.
xcrun simctl terminate "$scenarios_device" "$scenarios_app" >/dev/null 2>&1 || true
scenarios_container="$(xcrun simctl get_app_container "$scenarios_device" "$scenarios_app" data)"
scenarios_artifacts="${SCENARIOS_ARTIFACTS_DIR:-$scenarios_root/artifacts/scenarios-ios}"
scenarios_snapshot_dir="$scenarios_artifacts/snapshot/$scenarios_device"
mkdir -p "$scenarios_snapshot_dir"
rsync -a --delete "$scenarios_container/" "$scenarios_snapshot_dir/"
echo "Captured app data snapshot: $scenarios_snapshot_dir"
