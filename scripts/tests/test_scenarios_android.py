"""Runner contract: invalid args/target/app stop before Maestro; test status
propagates; a per-AVD snapshot (CheL-97) is restored before Maestro runs."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
RUNNER = ROOT / 'scripts/scenarios-android.sh'

CONTAINER_PREFIX = '/data/data/com.checklister'
STAGING_PREFIX = '/data/local/tmp'

ADB_STUB = r'''#!/bin/bash
map() {
  case "$1" in
    ''' + CONTAINER_PREFIX + r'''*) printf '%s' "$CONTAINER${1#''' + CONTAINER_PREFIX + r'''}" ;;
    ''' + STAGING_PREFIX + r'''*) printf '%s' "$STAGING${1#''' + STAGING_PREFIX + r'''}" ;;
    *) printf '%s' "$1" ;;
  esac
}

if [ "$1" = devices ]; then
  printf '%s' "$DEVICES"
  exit 0
fi

# drop "-s <serial>"
shift 2

case "$1" in
  shell)
    shift
    case "$1" in
      pm) exit "${APP_RESULT:-0}" ;;
      id) printf '%s' "${UID_RESULT:-0}" ;;
      am) exit 0 ;;
      rm)
        echo delete >> "$SEQUENCE_LOG"
        shift
        args=()
        for a in "$@"; do args+=("$(map "$a")"); done
        exec rm "${args[@]}"
        ;;
      tar)
        echo extract >> "$SEQUENCE_LOG"
        exit "${EXTRACT_RESULT:-0}"
        ;;
    esac
    ;;
  root) exit "${ROOT_RESULT:-0}" ;;
  wait-for-device) exit 0 ;;
  emu)
    shift
    if [ "$1" = avd ] && [ "$2" = name ]; then
      printf '%s\nOK\n' "$AVD_NAME"
    fi
    ;;
  push)
    echo push >> "$SEQUENCE_LOG"
    mkdir -p "$STAGING"
    cp "$2" "$(map "$3")"
    ;;
esac
'''

MAESTRO_STUB = '''#!/bin/bash
echo maestro >> "$SEQUENCE_LOG"
printf "%s\\n" "$@" > "$CALLS"
exit "${RESULT:-0}"
'''


class ScenarioRunnerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)
        self.container = self.path / 'container'
        (self.container / 'files').mkdir(parents=True)
        (self.container / 'files' / 'stale-from-a-failed-run.txt').write_text('stale')
        (self.container / 'cache').mkdir()
        (self.container / 'code_cache').mkdir()
        self.staging = self.path / 'staging'
        self.staging.mkdir()
        self.env = dict(os.environ, PATH=f'{self.path}:' + os.environ['PATH'],
                        SCENARIOS_ARTIFACTS_DIR=str(self.path / 'artifacts'))
        self.env.pop('ANDROID_HOME', None)
        self.env.pop('ANDROID_SDK_ROOT', None)
        self.write_tool('maestro', MAESTRO_STUB)
        self.env['CALLS'] = str(self.path / 'calls')
        self.env['SEQUENCE_LOG'] = str(self.path / 'sequence')
        self.write_tool('adb', ADB_STUB)
        self.env['DEVICES'] = 'List of devices attached\nemulator-5554\tdevice\n\n'
        self.env['AVD_NAME'] = 'Pixel_5_API36'
        self.env['CONTAINER'] = str(self.container)
        self.env['STAGING'] = str(self.staging)

    def write_tool(self, name, body):
        path = self.path / name
        path.write_text(body)
        path.chmod(0o755)

    def sequence(self):
        log = self.path / 'sequence'
        return log.read_text().splitlines() if log.exists() else []

    def run_script(self, *args):
        return subprocess.run(['bash', str(RUNNER), *args], env=self.env,
                              text=True, capture_output=True)

    def test_requires_explicit_serial(self):
        result = self.run_script()
        self.assertEqual(result.returncode, 2)
        self.assertIn('Usage:', result.stderr)
        self.assertFalse((self.path / 'calls').exists())

    def test_rejects_extra_arguments(self):
        self.assertEqual(self.run_script('emulator-5554', 'unexpected').returncode, 2)

    def test_rejects_unknown_offline_unauthorized_or_non_emulator_serial(self):
        for devices in (
            'List of devices attached\n\n',
            'List of devices attached\nemulator-5554\toffline\n\n',
            'List of devices attached\nemulator-5554\tunauthorized\n\n',
            'List of devices attached\n0123456789ABCDEF\tdevice\n\n',
        ):
            with self.subTest(devices=devices):
                self.env['DEVICES'] = devices
                result = self.run_script('emulator-5554')
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('running emulator', result.stderr)
                self.assertFalse((self.path / 'calls').exists())

    def test_missing_app_stops_before_maestro(self):
        self.env['APP_RESULT'] = '1'
        result = self.run_script('emulator-5554')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Install CheckLister', result.stderr)
        self.assertFalse((self.path / 'calls').exists())

    def test_falls_back_to_android_home_platform_tools_when_adb_missing(self):
        (self.path / 'adb').unlink()
        self.env['PATH'] = f'{self.path}:/usr/bin:/bin'
        sdk = self.path / 'sdk'
        (sdk / 'platform-tools').mkdir(parents=True)
        self.write_tool('sdk/platform-tools/adb', ADB_STUB)
        self.env['ANDROID_HOME'] = str(sdk)
        result = self.run_script('emulator-5554')
        self.assertEqual(result.returncode, 0)

    def test_missing_adb_without_sdk_fallback_reports_setup_pointer(self):
        (self.path / 'adb').unlink()
        self.env['PATH'] = f'{self.path}:/usr/bin:/bin'
        result = self.run_script('emulator-5554')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('docs/SCENARIOS.md', result.stderr)

    def test_preserves_failure_and_selects_serial_and_artifacts(self):
        self.env['RESULT'] = '7'
        result = self.run_script('emulator-5554')
        self.assertEqual(result.returncode, 7)
        args = (self.path / 'calls').read_text().splitlines()
        self.assertEqual(args[:3], ['--device', 'emulator-5554', 'test'])
        self.assertIn('--test-output-dir', args)
        self.assertIn('--format', args)
        self.assertIn('junit', args)
        e_index = args.index('-e')
        self.assertEqual(args[e_index + 1], 'APP_ID=com.checklister')
        tags_index = args.index('--include-tags')
        self.assertEqual(args[tags_index + 1], 'android')
        self.assertEqual(args[-1], str(ROOT / '.maestro'))

    def test_success_returns_zero(self):
        self.assertEqual(self.run_script('emulator-5554').returncode, 0)

    # --- CheL-97: snapshot restore ---

    def test_no_snapshot_runs_maestro_without_restoring(self):
        result = self.run_script('emulator-5554')
        self.assertEqual(result.returncode, 0)
        self.assertIn('No snapshot found', result.stdout)
        self.assertEqual(self.sequence(), ['maestro'])

    def test_restores_snapshot_before_maestro_runs(self):
        snapshot_dir = self.path / 'artifacts/snapshot'
        snapshot_dir.mkdir(parents=True)
        snapshot_container = self.path / 'snapshot-source'
        (snapshot_container / 'shared_prefs').mkdir(parents=True)
        (snapshot_container / 'shared_prefs' / 'prefs.xml').write_text('from snapshot')
        subprocess.run(['tar', '-cf', str(snapshot_dir / 'Pixel_5_API36.tar'), '-C',
                        str(snapshot_container), '.'], check=True)

        result = self.run_script('emulator-5554')

        self.assertEqual(result.returncode, 0)
        self.assertIn('Restoring app data from snapshot', result.stdout)
        # Second "delete" is the staged-tar cleanup (/data/local/tmp), not
        # the allowlist deletion under app-private storage.
        self.assertEqual(self.sequence(), ['delete', 'push', 'extract', 'delete', 'maestro'])

    def test_restore_deletes_a_file_absent_from_the_snapshot(self):
        # scenarios_ensure_root's `rm -rf` allowlist must remove the stale
        # file under `files/` (created in setUp) before extraction, the same
        # way iOS's `rsync --delete` does — otherwise a record from a failed
        # prior run would survive into the next.
        snapshot_dir = self.path / 'artifacts/snapshot'
        snapshot_dir.mkdir(parents=True)
        snapshot_container = self.path / 'snapshot-source'
        snapshot_container.mkdir()
        subprocess.run(['tar', '-cf', str(snapshot_dir / 'Pixel_5_API36.tar'), '-C',
                        str(snapshot_container), '.'], check=True)

        self.run_script('emulator-5554')

        self.assertFalse((self.container / 'files' / 'stale-from-a-failed-run.txt').exists())

    def test_restore_never_touches_cache_or_code_cache(self):
        (self.container / 'cache' / 'marker.db').write_text('must survive')
        (self.container / 'code_cache' / 'marker').write_text('must survive')
        snapshot_dir = self.path / 'artifacts/snapshot'
        snapshot_dir.mkdir(parents=True)
        snapshot_container = self.path / 'snapshot-source'
        snapshot_container.mkdir()
        subprocess.run(['tar', '-cf', str(snapshot_dir / 'Pixel_5_API36.tar'), '-C',
                        str(snapshot_container), '.'], check=True)

        self.run_script('emulator-5554')

        self.assertTrue((self.container / 'cache' / 'marker.db').exists())
        self.assertTrue((self.container / 'code_cache' / 'marker').exists())

    def test_failing_restore_aborts_before_maestro(self):
        snapshot_dir = self.path / 'artifacts/snapshot'
        snapshot_dir.mkdir(parents=True)
        (snapshot_dir / 'Pixel_5_API36.tar').write_text('not a real tar')
        self.env['EXTRACT_RESULT'] = '1'

        result = self.run_script('emulator-5554')

        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.path / 'calls').exists())


if __name__ == '__main__':
    unittest.main()
