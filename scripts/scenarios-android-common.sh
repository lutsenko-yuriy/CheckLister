# Shared validation and helpers for scenarios-android.sh and
# scenarios-snapshot-android.sh: an explicit serial argument, required
# tools, a running emulator with CheckLister installed, root access (needed
# to read/write app-private storage — see scenarios_ensure_root), and
# AVD-name resolution for keying snapshots. Sourced, not executed — relies
# on the caller's own `set -euo pipefail`.

scenarios_app='com.checklister'

scenarios_require_tools() {
  for tool in "$@"; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      echo "Missing $tool. See docs/SCENARIOS.md for setup." >&2
      exit 1
    fi
  done
}

scenarios_resolve_adb() {
  scenarios_adb='adb'
  if ! command -v "$scenarios_adb" >/dev/null 2>&1; then
    scenarios_adb="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}/platform-tools/adb"
    if [[ -z "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" || ! -x "$scenarios_adb" ]]; then
      echo 'Missing adb. See docs/SCENARIOS.md for setup.' >&2
      exit 1
    fi
  fi
}

scenarios_validate_device_and_app() {
  local serial="$1"
  if ! "$scenarios_adb" devices | awk -v serial="$serial" \
      'BEGIN{found=0} $1==serial && $2=="device"{found=1} END{exit !found}'; then
    echo 'Select a running emulator serial from: adb devices' >&2
    exit 1
  fi
  if [[ "$serial" != emulator-* ]]; then
    echo 'Select a running emulator serial from: adb devices' >&2
    exit 1
  fi
  if ! "$scenarios_adb" -s "$serial" shell pm path "$scenarios_app" >/dev/null 2>&1; then
    echo 'Install CheckLister on the selected emulator first. See docs/SCENARIOS.md.' >&2
    exit 1
  fi
}

# app-private storage (/data/data/<app>) is not readable by the `shell`
# user and CheckLister's Release build is never `run-as`-debuggable (CheL-97:
# `run-as` fails with "package not debuggable" against a Release APK, same
# as every other build this suite installs) — so this needs `adb root`,
# which only a "Google APIs" system image permits (a "Google Play" image
# refuses it). See docs/SCENARIOS.md's Android setup section.
scenarios_ensure_root() {
  local serial="$1"
  "$scenarios_adb" -s "$serial" root >/dev/null 2>&1 || true
  "$scenarios_adb" -s "$serial" wait-for-device
  if [[ "$("$scenarios_adb" -s "$serial" shell id -u | tr -d '\r\n')" != '0' ]]; then
    echo 'adb root was refused on this emulator. The snapshot mechanism needs a "Google APIs" system image (not "Google Play"), which permits adb root. See docs/SCENARIOS.md.' >&2
    exit 1
  fi
}

# emulator-5554 is a port, not an identity — it is reused by whatever AVD
# boots first and changes for the same AVD across reboots, so keying a
# snapshot by serial would silently restore one AVD's data onto another.
# The AVD name is stable for that AVD's lifetime instead.
scenarios_resolve_avd_name() {
  local serial="$1"
  local name
  name="$("$scenarios_adb" -s "$serial" emu avd name 2>/dev/null | head -n1 | tr -d '\r\n')"
  if [[ -z "$name" ]]; then
    echo "Could not resolve an AVD name for $serial — keying its snapshot by serial instead." >&2
    name="$serial"
  fi
  printf '%s' "$name"
}
