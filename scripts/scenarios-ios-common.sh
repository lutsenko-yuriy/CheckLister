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
