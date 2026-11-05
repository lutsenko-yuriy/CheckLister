# Shared by scenarios-build-ios.sh and scenarios-build-android.sh (CheL-147):
# a scenario build swaps the real Firebase config for the committed dummy one
# and restores it on exit, so scenarios never touch the production project.
# Sourced, not executed — relies on the caller's own `set -euo pipefail`.

scenarios_build_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Fails (before touching anything) on a stale backup: a previous build was
# killed hard, and the backup is the only copy of the real config.
scenarios_swap_firebase_config() {
  local target="$1" dummy="$2"
  local backup="$target.scenarios-backup"
  if [[ -e "$backup" ]]; then
    echo "Stale $backup — a previous scenario build was interrupted. Restore it over $target (or delete it) first." >&2
    exit 1
  fi
  scenarios_firebase_target="$target"
  scenarios_firebase_had_real=0
  if [[ -e "$target" ]]; then
    scenarios_firebase_had_real=1
    mv "$target" "$backup"
  fi
  trap scenarios_restore_firebase_config EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  cp "$dummy" "$target"
}

scenarios_restore_firebase_config() {
  local backup="$scenarios_firebase_target.scenarios-backup"
  rm -f "$scenarios_firebase_target"
  if [[ "$scenarios_firebase_had_real" == 1 ]]; then
    mv "$backup" "$scenarios_firebase_target"
  fi
}

scenarios_require_scenario_flag_unset_or_on() {
  if [[ -n "${CHECKLISTER_SCENARIO_BUILD:-}" && "$CHECKLISTER_SCENARIO_BUILD" != 1 ]]; then
    echo "CHECKLISTER_SCENARIO_BUILD is set to '$CHECKLISTER_SCENARIO_BUILD'; a scenario build needs 1 (or unset)." >&2
    exit 1
  fi
}
