"""Runner contract: invalid args/target/app stop before Maestro; test status propagates."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
RUNNER = ROOT / 'scripts/scenarios-android.sh'


class ScenarioRunnerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)
        self.env = dict(os.environ, PATH=f'{self.path}:' + os.environ['PATH'],
                        SCENARIOS_ARTIFACTS_DIR=str(self.path / 'artifacts'))
        self.env.pop('ANDROID_HOME', None)
        self.env.pop('ANDROID_SDK_ROOT', None)
        self.write_tool('maestro', 'printf "%s\\n" "$@" > "$CALLS"\nexit "${RESULT:-0}"')
        self.env['CALLS'] = str(self.path / 'calls')
        self.write_tool('adb', '''if [ "$1" = devices ]; then
  printf '%s' "$DEVICES"
elif [ "$1" = "-s" ] && [ "$3" = shell ] && [ "$4" = pm ]; then
  exit "${APP_RESULT:-0}"
fi''')
        self.env['DEVICES'] = 'List of devices attached\nemulator-5554\tdevice\n\n'

    def write_tool(self, name, body):
        path = self.path / name
        path.write_text('#!/bin/bash\n' + body + '\n')
        path.chmod(0o755)

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
        self.write_tool('sdk/platform-tools/adb', '''if [ "$1" = devices ]; then
  printf '%s' "$DEVICES"
elif [ "$1" = "-s" ] && [ "$3" = shell ] && [ "$4" = pm ]; then
  exit "${APP_RESULT:-0}"
fi''')
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


if __name__ == '__main__':
    unittest.main()
