# Shared validation for scenarios-ios.sh and scenarios-snapshot-ios.sh: an
# explicit device argument, required tools, a booted iOS simulator, and
# CheckLister installed there. Sourced, not executed — relies on the
# caller's own `set -euo pipefail`.

scenarios_app='com.checklister.checklisterApp'

scenarios_require_tools() {
  for tool in "$@"; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      echo "Missing $tool. See docs/SCENARIOS.md for setup." >&2
      exit 1
    fi
  done
}

# CheL-105: parses a comma-separated device-list positional arg into the
# global `scenarios_devices` array. A single value with no comma is a
# one-element list, so callers that only ever passed one device keep working
# unchanged. Rejects an empty entry (stray/leading/trailing comma) or a
# duplicate before any device is touched.
scenarios_parse_devices() {
  local input="$1"
  if [[ "$input" == ,* || "$input" == *, || "$input" == *,,* ]]; then
    echo 'Device list contains an empty entry — check for extra commas.' >&2
    exit 2
  fi
  IFS=',' read -ra scenarios_devices <<< "$input"
  local seen=' '
  for d in "${scenarios_devices[@]}"; do
    if [[ "$seen" == *" $d "* ]]; then
      echo "Duplicate device in list: $d" >&2
      exit 2
    fi
    seen+="$d "
  done
}

scenarios_validate_device_and_app() {
  local device="$1"
  if ! xcrun simctl list devices booted -j | node -e '
    let input = "";
    process.stdin.on("data", chunk => input += chunk);
    process.stdin.on("end", () => {
      const match = Object.entries(JSON.parse(input).devices).some(([runtime, devices]) =>
        runtime.includes(".iOS-") && devices.some(device =>
          device.udid === process.argv[1] && device.state === "Booted" && device.isAvailable));
      process.exit(match ? 0 : 1);
    });
  ' "$device"; then
    echo 'Select a booted iOS simulator UDID from: xcrun simctl list devices booted' >&2
    exit 1
  fi
  if ! xcrun simctl get_app_container "$device" "$scenarios_app" app >/dev/null 2>&1; then
    echo 'Install CheckLister on the selected simulator first. See docs/SCENARIOS.md.' >&2
    exit 1
  fi
}

# CheL-105: extracted from scenarios-ios.sh so a sharded run can restore
# each device's own snapshot before Maestro starts on any of them. Requires
# `scenarios_artifacts` to already be set by the caller.
scenarios_restore_ios_snapshot() {
  local device="$1"
  local snapshot_dir="$scenarios_artifacts/snapshot/$device"
  if [[ -d "$snapshot_dir" ]]; then
    echo "Restoring app data from snapshot: $snapshot_dir"
    xcrun simctl terminate "$device" "$scenarios_app" >/dev/null 2>&1 || true
    local container
    container="$(xcrun simctl get_app_container "$device" "$scenarios_app" data)"
    # Excluded from the snapshot itself (see scenarios-snapshot-ios.sh) —
    # exclude it here too so restore doesn't wipe the container's
    # regenerable cache.
    rsync -a --delete --exclude 'Library/Caches' "$snapshot_dir/" "$container/"
  else
    echo 'No snapshot found for this device — running without restoring app data. See npm run scenarios:snapshot:ios in docs/SCENARIOS.md.'
  fi
}
