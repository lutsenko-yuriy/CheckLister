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
        self.write_tool('xcrun', '''if [ "$2" = list ]; then
  printf '%s' "$DEVICES"
else
  exit "${APP_RESULT:-0}"
fi''')
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
        self.assertIn('-e', args)
        self.assertIn('APP_ID=org.reactjs.native.example.CheckLister', args)
        self.assertIn('--include-tags', args)
        self.assertIn('ios', args)
        self.assertEqual(args[-1], str(ROOT / '.maestro'))

    def test_success_returns_zero(self):
        self.assertEqual(self.run_script('test-device').returncode, 0)


if __name__ == '__main__':
    unittest.main()
