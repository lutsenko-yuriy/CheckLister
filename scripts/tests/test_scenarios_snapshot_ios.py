"""Snapshot-capture contract: same device/app validation as the runner;
captures the (stubbed, tmp-rooted) app container into a per-device snapshot."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
RUNNER = ROOT / 'scripts/scenarios-snapshot-ios.sh'


class ScenarioSnapshotTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)
        self.container = self.path / 'container'
        (self.container / 'Documents').mkdir(parents=True)
        (self.container / 'Documents' / 'RCTAsyncLocalStorage_V1').write_text('fixture')
        (self.container / 'Library' / 'Caches').mkdir(parents=True)
        (self.container / 'Library' / 'Caches' / 'webkit.db').write_text('regenerable')
        self.env = dict(os.environ, PATH=f'{self.path}:' + os.environ['PATH'],
                        SCENARIOS_ARTIFACTS_DIR=str(self.path / 'artifacts'))
        self.write_tool('xcrun', f'''case "$2" in
  list) printf '%s' "$DEVICES" ;;
  get_app_container)
    if [ "$5" = app ]; then exit "${{APP_RESULT:-0}}"; fi
    if [ "$5" = data ]; then printf '%s' "{self.container}"; fi
    ;;
  terminate) exit 0 ;;
esac''')
        self.env['DEVICES'] = json.dumps({'devices': {'com.apple.CoreSimulator.SimRuntime.iOS-26-5': [
            {'udid': 'test-device', 'state': 'Booted', 'isAvailable': True}]}})

    def write_tool(self, name, body):
        path = self.path / name
        path.write_text('#!/bin/bash\n' + body + '\n')
        path.chmod(0o755)

    def run_script(self, *args):
        return subprocess.run(['bash', str(RUNNER), *args], env=self.env,
                              text=True, capture_output=True)

    def test_requires_explicit_device(self):
        result = self.run_script()
        self.assertEqual(result.returncode, 2)
        self.assertIn('Usage:', result.stderr)

    def test_rejects_extra_arguments(self):
        self.assertEqual(self.run_script('test-device', 'unexpected').returncode, 2)

    def test_rejects_non_booted_target(self):
        self.env['DEVICES'] = json.dumps({'devices': {}})
        result = self.run_script('test-device')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('booted iOS simulator', result.stderr)

    def test_missing_app_stops_before_capture(self):
        self.env['APP_RESULT'] = '1'
        result = self.run_script('test-device')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Install CheckLister', result.stderr)

    def test_captures_container_into_per_device_snapshot(self):
        result = self.run_script('test-device')
        self.assertEqual(result.returncode, 0)
        snapshot = self.path / 'artifacts/snapshot/test-device'
        self.assertTrue(
            (snapshot / 'Documents' / 'RCTAsyncLocalStorage_V1').read_text() == 'fixture',
        )
        self.assertIn(str(snapshot), result.stdout)

    def test_overwrites_a_prior_snapshot(self):
        snapshot = self.path / 'artifacts/snapshot/test-device'
        snapshot.mkdir(parents=True)
        (snapshot / 'stale.txt').write_text('leftover from a previous capture')

        self.run_script('test-device')

        self.assertFalse((snapshot / 'stale.txt').exists())
        self.assertTrue((snapshot / 'Documents' / 'RCTAsyncLocalStorage_V1').exists())

    def test_excludes_library_caches_from_the_snapshot(self):
        self.run_script('test-device')

        snapshot = self.path / 'artifacts/snapshot/test-device'
        self.assertFalse((snapshot / 'Library' / 'Caches').exists())


if __name__ == '__main__':
    unittest.main()
