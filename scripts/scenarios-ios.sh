#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || -z "$1" ]]; then
  echo 'Usage: npm run scenarios:ios -- <booted-ios-simulator-udid>' >&2
  exit 2
fi
for tool in node xcrun maestro; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing $tool. See docs/SCENARIOS.md for setup." >&2
    exit 1
  fi
done

scenarios_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
scenarios_device="$1"
scenarios_app='com.checklister.checklisterApp'
if ! xcrun simctl list devices booted -j | node -e '
  let input = "";
  process.stdin.on("data", chunk => input += chunk);
  process.stdin.on("end", () => {
    const match = Object.entries(JSON.parse(input).devices).some(([runtime, devices]) =>
      runtime.includes(".iOS-") && devices.some(device =>
        device.udid === process.argv[1] && device.state === "Booted" && device.isAvailable));
    process.exit(match ? 0 : 1);
  });
' "$scenarios_device"; then
  echo 'Select a booted iOS simulator UDID from: xcrun simctl list devices booted' >&2
  exit 1
fi
if ! xcrun simctl get_app_container "$scenarios_device" "$scenarios_app" app >/dev/null 2>&1; then
  echo 'Install CheckLister on the selected simulator first. See docs/SCENARIOS.md.' >&2
  exit 1
fi

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
