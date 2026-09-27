"""Runner contract: invalid args/target/app stop before Maestro; test status propagates."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
RUNNER = ROOT / 'scripts/scenarios-ios.sh'


class ScenarioRunnerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)
        self.env = dict(os.environ, PATH=f'{self.path}:' + os.environ['PATH'],
                        SCENARIOS_ARTIFACTS_DIR=str(self.path / 'artifacts'))
        self.write_tool('maestro', 'printf "%s\\n" "$@" > "$CALLS"\nexit "${RESULT:-0}"')
        self.env['CALLS'] = str(self.path / 'calls')
        self.env['CONTAINER_ROOT'] = str(self.path / 'containers')
        self.container = self.path / 'containers' / 'test-device'
        self.container.mkdir(parents=True)
        self.write_tool('xcrun', f'''case "$2" in
  list) printf '%s' "$DEVICES" ;;
  get_app_container)
    if [ "$5" = app ]; then exit "${{APP_RESULT:-0}}"; fi
    if [ "$5" = data ]; then mkdir -p "$CONTAINER_ROOT/$3"; printf '%s' "$CONTAINER_ROOT/$3"; fi
    ;;
  terminate) exit 0 ;;
  spawn) exit 0 ;;
esac''')
        self.env['DEVICES'] = json.dumps({'devices': {'com.apple.CoreSimulator.SimRuntime.iOS-26-5': [
            {'udid': 'test-device', 'state': 'Booted', 'isAvailable': True}]}})

    def devices_json(self, *udids):
        return json.dumps({'devices': {'com.apple.CoreSimulator.SimRuntime.iOS-26-5': [
            {'udid': u, 'state': 'Booted', 'isAvailable': True} for u in udids]}})

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
        self.assertFalse((self.path / 'calls').exists())

    def test_rejects_extra_arguments(self):
        self.assertEqual(self.run_script('test-device', 'unexpected').returncode, 2)

    def test_rejects_non_booted_or_other_platform_target(self):
        for devices in ({'devices': {}}, {'devices': {'tvOS': [
                {'udid': 'test-device', 'state': 'Booted', 'isAvailable': True}]}},
                {'devices': {'com.apple.CoreSimulator.SimRuntime.iOS-26-5': [
                    {'udid': 'test-device', 'state': 'Shutdown', 'isAvailable': True}]}}):
            with self.subTest(devices=devices):
                self.env['DEVICES'] = json.dumps(devices)
                result = self.run_script('test-device')
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('booted iOS simulator', result.stderr)
                self.assertFalse((self.path / 'calls').exists())

    def test_missing_app_stops_before_maestro(self):
        self.env['APP_RESULT'] = '1'
        result = self.run_script('test-device')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Install CheckLister', result.stderr)
        self.assertFalse((self.path / 'calls').exists())

    def test_preserves_failure_and_selects_device_and_artifacts(self):
        self.env['RESULT'] = '7'
        result = self.run_script('test-device')
        self.assertEqual(result.returncode, 7)
        args = (self.path / 'calls').read_text().splitlines()
        self.assertEqual(args[:3], ['--device', 'test-device', 'test'])
        self.assertIn('--test-output-dir', args)
        self.assertIn('--format', args)
        self.assertIn('junit', args)
        e_index = args.index('-e')
        self.assertEqual(args[e_index + 1], 'APP_ID=com.checklister.checklisterApp')
        tags_index = args.index('--include-tags')
        self.assertEqual(args[tags_index + 1], 'ios')
        self.assertEqual(args[-1], str(ROOT / '.maestro'))

    def test_success_returns_zero(self):
        self.assertEqual(self.run_script('test-device').returncode, 0)

    def test_runs_without_restoring_when_no_snapshot_exists(self):
        result = self.run_script('test-device')
        self.assertEqual(result.returncode, 0)
        self.assertIn('No snapshot found', result.stdout)
        self.assertEqual(list(self.container.iterdir()), [])

    def test_restores_snapshot_onto_container_before_maestro_runs(self):
        snapshot = self.path / 'artifacts/snapshot/test-device'
        snapshot.mkdir(parents=True)
        (snapshot / 'Documents').mkdir()
        (snapshot / 'Documents' / 'runHistory.json').write_text('seeded')
        (self.container / 'stale.json').write_text('leftover from a previous run')

        result = self.run_script('test-device')

        self.assertEqual(result.returncode, 0)
        self.assertIn('Restoring app data from snapshot', result.stdout)
        self.assertEqual(
            (self.container / 'Documents' / 'runHistory.json').read_text(), 'seeded',
        )
        self.assertFalse((self.container / 'stale.json').exists())

    def test_restore_does_not_wipe_the_containers_cache(self):
        snapshot = self.path / 'artifacts/snapshot/test-device'
        snapshot.mkdir(parents=True)
        (self.container / 'Library' / 'Caches').mkdir(parents=True)
        (self.container / 'Library' / 'Caches' / 'webkit.db').write_text('regenerable')

        self.run_script('test-device')

        self.assertTrue(
            (self.container / 'Library' / 'Caches' / 'webkit.db').exists(),
        )

    # --- CheL-105: multi-device / sharding ---

    def test_rejects_malformed_device_list_before_validation(self):
        for value in ('test-device,', ',test-device',
                      'test-device,,device-b', 'device-a,device-a'):
            with self.subTest(value=value):
                result = self.run_script(value)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse((self.path / 'calls').exists())

    def test_second_device_validation_failure_stops_before_maestro(self):
        self.env['DEVICES'] = self.devices_json('device-a')  # device-b not booted
        result = self.run_script('device-a,device-b')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('booted iOS simulator', result.stderr)
        self.assertFalse((self.path / 'calls').exists())

    def test_two_devices_produce_udid_and_shard_split(self):
        self.env['DEVICES'] = self.devices_json('device-a', 'device-b')
        result = self.run_script('device-a,device-b')
        self.assertEqual(result.returncode, 0)
        args = (self.path / 'calls').read_text().splitlines()
        self.assertNotIn('--device', args)
        self.assertNotIn('--test-output-dir', args)
        udid_index = args.index('--udid')
        self.assertEqual(args[udid_index + 1], 'device-a,device-b')
        self.assertIn('--shard-split=2', args)
        e_index = args.index('-e')
        self.assertEqual(args[e_index + 1], 'APP_ID=com.checklister.checklisterApp')
        tags_index = args.index('--include-tags')
        self.assertEqual(args[tags_index + 1], 'ios')

    def test_three_devices_produce_shard_split_three(self):
        self.env['DEVICES'] = self.devices_json('device-a', 'device-b', 'device-c')
        result = self.run_script('device-a,device-b,device-c')
        self.assertEqual(result.returncode, 0)
        args = (self.path / 'calls').read_text().splitlines()
        self.assertIn('--shard-split=3', args)

    def test_restores_snapshot_for_each_device_independently(self):
        self.env['DEVICES'] = self.devices_json('device-a', 'device-b')
        snap_a = self.path / 'artifacts/snapshot/device-a'
        snap_a.mkdir(parents=True)
        (snap_a / 'seed-a.txt').write_text('a')
        # device-b has no snapshot.

        result = self.run_script('device-a,device-b')

        self.assertEqual(result.returncode, 0)
        container_a = self.path / 'containers' / 'device-a'
        container_b = self.path / 'containers' / 'device-b'
        self.assertEqual((container_a / 'seed-a.txt').read_text(), 'a')
        self.assertFalse((container_b / 'seed-a.txt').exists())
        self.assertEqual(result.stdout.count('Restoring app data from snapshot'), 1)
        self.assertIn('No snapshot found', result.stdout)


if __name__ == '__main__':
    unittest.main()
