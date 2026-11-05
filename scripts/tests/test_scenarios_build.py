"""Scenario build scripts (CheL-147): swap in the dummy Firebase config, restore the
real one on every exit path, refuse a stale backup or a bad flag, prove the marker.

Runs against a throwaway copy of scripts/ so the developer's real config is never touched.
"""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[2]
MARKER = b'checklister-scenario-build-marker'
REAL = 'REAL CONFIG'


class ScenarioBuildScriptTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name) / 'repo'
        shutil.copytree(ROOT / 'scripts', self.root / 'scripts',
                        ignore=shutil.ignore_patterns('tests', '__pycache__'))
        self.bin = Path(tmp.name) / 'bin'
        self.bin.mkdir()
        self.log = Path(tmp.name) / 'log'
        self.env = dict(os.environ, PATH=f'{self.bin}:' + os.environ['PATH'], LOG=str(self.log),
                        SCENARIOS_DERIVED_DATA=str(Path(tmp.name) / 'derived'))
        self.env.pop('CHECKLISTER_SCENARIO_BUILD', None)
        self.plist = self.root / 'ios/CheckLister/GoogleService-Info.plist'
        self.json = self.root / 'android/app/google-services.json'
        for target in (self.plist, self.json):
            target.parent.mkdir(parents=True)
            target.write_text(REAL)
        self.tool('xcodebuild', self.xcodebuild())
        self.tool('xcrun', 'echo "xcrun $*" >> "$LOG"')
        gradlew = self.root / 'android/gradlew'
        gradlew.write_text(self.gradlew())
        gradlew.chmod(0o755)

    def tool(self, name, body):
        path = self.bin / name
        path.write_text('#!/bin/bash\n' + body + '\n')
        path.chmod(0o755)

    def xcodebuild(self, marker=True, result=0):
        payload = MARKER if marker else b'plain'
        return f'''echo "xcodebuild flag=$CHECKLISTER_SCENARIO_BUILD config=$(cat {self.plist})" >> "$LOG"
app="$SCENARIOS_DERIVED_DATA/Build/Products/Release-iphonesimulator/CheckLister.app"
mkdir -p "$app"; printf '%s' '{payload.decode()}' > "$app/main.jsbundle"
exit {result}'''

    def gradlew(self, marker=True, result=0):
        payload = MARKER.decode() if marker else 'plain'
        return f'''#!/bin/bash
echo "gradlew $* flag=$CHECKLISTER_SCENARIO_BUILD config=$(cat "$(dirname "$0")/app/google-services.json")" >> "$LOG"
mkdir -p "$(dirname "$0")/app/build/outputs/apk/release"
python3 -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1],'w').writestr('assets/index.bundle', sys.argv[2])" \\
  "$(dirname "$0")/app/build/outputs/apk/release/app-release.apk" '{payload}'
exit {result}'''

    def run_script(self, name, *args):
        return subprocess.run(['bash', str(self.root / 'scripts' / name), *args], env=self.env,
                              text=True, capture_output=True)

    def logged(self):
        return self.log.read_text() if self.log.exists() else ''

    def test_ios_builds_with_flag_and_dummy_config_then_restores_real_one(self):
        result = self.run_script('scenarios-build-ios.sh', 'UDID')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('flag=1', self.logged())
        self.assertIn('checklister-scenarios-dummy', self.logged())
        self.assertEqual(self.plist.read_text(), REAL)
        self.assertFalse(Path(f'{self.plist}.scenarios-backup').exists())
        self.assertIn('xcrun simctl install UDID', self.logged())

    def test_android_builds_with_flag_dummy_config_and_forwards_arguments(self):
        result = self.run_script('scenarios-build-android.sh', '-PreactNativeArchitectures=x86_64')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('assembleRelease -PreactNativeArchitectures=x86_64 flag=1', self.logged())
        self.assertIn('checklister-scenarios-dummy', self.logged())
        self.assertEqual(self.json.read_text(), REAL)

    def test_real_config_is_restored_when_the_build_fails(self):
        self.tool('xcodebuild', self.xcodebuild(result=3))
        result = self.run_script('scenarios-build-ios.sh', 'UDID')
        self.assertEqual(result.returncode, 3)
        self.assertEqual(self.plist.read_text(), REAL)
        self.assertFalse(Path(f'{self.plist}.scenarios-backup').exists())

    def test_ci_without_a_real_config_leaves_no_dummy_behind(self):
        self.json.unlink()
        result = self.run_script('scenarios-build-android.sh')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('checklister-scenarios-dummy', self.logged())
        self.assertFalse(self.json.exists())

    def test_stale_backup_stops_before_touching_anything(self):
        backup = Path(f'{self.json}.scenarios-backup')
        backup.write_text('the only copy of the real config')
        result = self.run_script('scenarios-build-android.sh')
        self.assertEqual(result.returncode, 1)
        self.assertIn('Stale', result.stderr)
        self.assertEqual(self.json.read_text(), REAL)
        self.assertEqual(backup.read_text(), 'the only copy of the real config')
        self.assertEqual(self.logged(), '')

    def test_rejects_a_flag_value_other_than_one(self):
        self.env['CHECKLISTER_SCENARIO_BUILD'] = '0'
        for script in ('scenarios-build-ios.sh', 'scenarios-build-android.sh'):
            with self.subTest(script=script):
                result = self.run_script(script, 'UDID')
                self.assertEqual(result.returncode, 1)
                self.assertIn('CHECKLISTER_SCENARIO_BUILD', result.stderr)
        self.assertEqual(self.logged(), '')

    def test_a_build_without_the_marker_fails(self):
        self.tool('xcodebuild', self.xcodebuild(marker=False))
        (self.root / 'android/gradlew').write_text(self.gradlew(marker=False))
        self.assertNotEqual(self.run_script('scenarios-build-ios.sh', 'UDID').returncode, 0)
        self.assertNotEqual(self.run_script('scenarios-build-android.sh').returncode, 0)
        self.assertNotIn('simctl install', self.logged())

    def test_ios_requires_a_device(self):
        self.assertEqual(self.run_script('scenarios-build-ios.sh').returncode, 2)

    def test_dummy_configs_pass_the_ci_config_checks(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location('wfc', ROOT / 'scripts/ci/write_firebase_config.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        firebase = ROOT / 'scripts/scenarios/firebase'
        module.check_ios((firebase / 'GoogleService-Info.plist').read_bytes())
        module.check_android((firebase / 'google-services.json').read_bytes())

    def test_dummy_api_key_is_valid_for_firebase_but_not_for_secret_scanning(self):
        # Firebase aborts the launch unless the key is 39 chars of base64url starting with
        # "A" (FIRInstallations validateAPIKey); GitHub flags any "AIza" + 35 chars.
        import plistlib
        import re
        firebase = ROOT / 'scripts/scenarios/firebase'
        plist = plistlib.loads((firebase / 'GoogleService-Info.plist').read_bytes())
        keys = [plist['API_KEY']]
        keys += re.findall(r'"current_key":\s*"([^"]+)"', (firebase / 'google-services.json').read_text())
        self.assertEqual(len(keys), 2)
        for key in keys:
            self.assertRegex(key, r'^A[A-Za-z0-9_-]{38}$')
            self.assertFalse(key.startswith('AIza'))


if __name__ == '__main__':
    unittest.main()
