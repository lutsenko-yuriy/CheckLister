#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || -z "$1" ]]; then
  echo 'Usage: npm run smoke:ios -- <booted-ios-simulator-udid>' >&2
  exit 2
fi
for tool in node xcrun maestro; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing $tool. See docs/SMOKE_TESTS.md for setup." >&2
    exit 1
  fi
done

smoke_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
smoke_device="$1"
smoke_app='org.reactjs.native.example.CheckLister'
if ! xcrun simctl list devices booted -j | node -e '
  let input = "";
  process.stdin.on("data", chunk => input += chunk);
  process.stdin.on("end", () => {
    const match = Object.entries(JSON.parse(input).devices).some(([runtime, devices]) =>
      runtime.includes(".iOS-") && devices.some(device =>
        device.udid === process.argv[1] && device.state === "Booted" && device.isAvailable));
    process.exit(match ? 0 : 1);
  });
' "$smoke_device"; then
  echo 'Select a booted iOS simulator UDID from: xcrun simctl list devices booted' >&2
  exit 1
fi
if ! xcrun simctl get_app_container "$smoke_device" "$smoke_app" app >/dev/null 2>&1; then
  echo 'Install CheckLister on the selected simulator first. See docs/SMOKE_TESTS.md.' >&2
  exit 1
fi

smoke_artifacts="${SMOKE_ARTIFACTS_DIR:-$smoke_root/artifacts/smoke-ios}"
mkdir -p "$smoke_artifacts"
smoke_output="$(mktemp -d "$smoke_artifacts/run-XXXXXXXX")"
echo "Smoke artifacts: $smoke_output"
exec maestro --device "$smoke_device" test \
  --format junit --output "$smoke_output/report.xml" \
  --test-output-dir "$smoke_output" "$smoke_root/.maestro"
