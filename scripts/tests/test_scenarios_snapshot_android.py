"""Snapshot-capture contract: same serial/app validation as the runner,
plus root access; captures the (stubbed, tmp-rooted) app-private directory
into a per-AVD tar snapshot."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
RUNNER = ROOT / 'scripts/scenarios-snapshot-android.sh'

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
  exec-out)
    shift
    args=()
    for a in "$@"; do args+=("$(map "$a")"); done
    exec "${args[@]}"
    ;;
esac
'''


class ScenarioSnapshotAndroidTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)
        self.container = self.path / 'container'
        (self.container / 'shared_prefs').mkdir(parents=True)
        (self.container / 'shared_prefs' / 'prefs.xml').write_text('fixture')
        (self.container / 'cache').mkdir()
        (self.container / 'cache' / 'regenerable.db').write_text('cache')
        (self.container / 'code_cache').mkdir()
        (self.container / 'code_cache' / 'x').write_text('code_cache')
        self.staging = self.path / 'staging'
        self.staging.mkdir()
        self.env = dict(
            os.environ, PATH=f'{self.path}:' + os.environ['PATH'],
            SCENARIOS_ARTIFACTS_DIR=str(self.path / 'artifacts'),
            CONTAINER=str(self.container), STAGING=str(self.staging),
        )
        self.env.pop('ANDROID_HOME', None)
        self.env.pop('ANDROID_SDK_ROOT', None)
        self.write_tool('adb', ADB_STUB)
        self.env['DEVICES'] = 'List of devices attached\nemulator-5554\tdevice\n\n'
        self.env['AVD_NAME'] = 'Pixel_5_API36'

    def write_tool(self, name, body):
        path = self.path / name
        path.write_text(body)
        path.chmod(0o755)

    def run_script(self, *args):
        return subprocess.run(['bash', str(RUNNER), *args], env=self.env,
                              text=True, capture_output=True)

    def test_requires_explicit_serial(self):
        result = self.run_script()
        self.assertEqual(result.returncode, 2)
        self.assertIn('Usage:', result.stderr)

    def test_rejects_extra_arguments(self):
        self.assertEqual(self.run_script('emulator-5554', 'unexpected').returncode, 2)

    def test_rejects_unknown_or_non_emulator_serial(self):
        self.env['DEVICES'] = 'List of devices attached\n\n'
        result = self.run_script('emulator-5554')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('running emulator', result.stderr)

    def test_missing_app_stops_before_capture(self):
        self.env['APP_RESULT'] = '1'
        result = self.run_script('emulator-5554')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Install CheckLister', result.stderr)

    def test_root_refused_reports_google_apis_pointer(self):
        self.env['UID_RESULT'] = '2000'
        result = self.run_script('emulator-5554')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Google APIs', result.stderr)
        self.assertIn('docs/SCENARIOS.md', result.stderr)

    def test_captures_container_into_a_per_avd_snapshot(self):
        result = self.run_script('emulator-5554')
        self.assertEqual(result.returncode, 0)
        snapshot = self.path / 'artifacts/snapshot/Pixel_5_API36.tar'
        self.assertTrue(snapshot.exists())
        self.assertIn(str(snapshot), result.stdout)
        listing = subprocess.run(['tar', '-tf', str(snapshot)], text=True,
                                 capture_output=True).stdout
        self.assertIn('shared_prefs/prefs.xml', listing)

    def test_overwrites_a_prior_snapshot(self):
        snapshot_dir = self.path / 'artifacts/snapshot'
        snapshot_dir.mkdir(parents=True)
        stale = snapshot_dir / 'Pixel_5_API36.tar'
        stale.write_text('leftover from a previous capture')

        self.run_script('emulator-5554')

        listing = subprocess.run(['tar', '-tf', str(stale)], text=True,
                                 capture_output=True).stdout
        self.assertIn('shared_prefs/prefs.xml', listing)

    def test_excludes_cache_and_code_cache_from_the_snapshot(self):
        self.run_script('emulator-5554')

        snapshot = self.path / 'artifacts/snapshot/Pixel_5_API36.tar'
        listing = subprocess.run(['tar', '-tf', str(snapshot)], text=True,
                                 capture_output=True).stdout
        self.assertNotIn('cache/regenerable.db', listing)
        self.assertNotIn('code_cache/x', listing)

    def test_falls_back_to_serial_when_avd_name_unresolvable(self):
        self.env['AVD_NAME'] = ''
        result = self.run_script('emulator-5554')
        self.assertEqual(result.returncode, 0)
        self.assertIn('keying its snapshot by serial instead', result.stderr)
        self.assertTrue((self.path / 'artifacts/snapshot/emulator-5554.tar').exists())

    def test_interrupted_capture_leaves_a_prior_snapshot_intact(self):
        snapshot_dir = self.path / 'artifacts/snapshot'
        snapshot_dir.mkdir(parents=True)
        good = snapshot_dir / 'Pixel_5_API36.tar'
        good.write_text('a prior good snapshot')

        # Make the container unreadable by `tar` to force capture to fail.
        (self.container / 'shared_prefs' / 'prefs.xml').chmod(0o000)
        self.addCleanup(lambda: (self.container / 'shared_prefs' / 'prefs.xml').chmod(0o644))
        import platform
        if platform.system() != 'Darwin' and os.geteuid() == 0:
            self.skipTest('cannot simulate a permission failure as root')

        result = self.run_script('emulator-5554')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(good.read_text(), 'a prior good snapshot')
        leftovers = list(snapshot_dir.glob('.*'))
        self.assertEqual(leftovers, [])


if __name__ == '__main__':
    unittest.main()
