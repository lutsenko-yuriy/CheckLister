import os
import subprocess
import sys
import tempfile
import unittest
import zipfile

SCRIPT = os.path.join(os.path.dirname(__file__), '..', 'ci', 'check_scenario_bundle.py')
MARKER = b'checklister-scenario-build-marker'


def run(*args):
    return subprocess.run(
        [sys.executable, '-I', SCRIPT, *args], capture_output=True, text=True,
    )


class CheckScenarioBundleTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)

    def path(self, name):
        return os.path.join(self.dir.name, name)

    def write(self, name, data):
        with open(self.path(name), 'wb') as f:
            f.write(data)
        return self.path(name)

    def test_absent_passes_on_a_bundle_without_the_marker(self):
        bundle = self.write('a.js', b'var a = 1;')
        self.assertEqual(run(bundle, '--expect', 'absent').returncode, 0)

    def test_absent_fails_on_a_bundle_with_the_marker(self):
        bundle = self.write('a.js', b'x;' + MARKER + b';y')
        result = run(bundle, '--expect', 'absent')
        self.assertEqual(result.returncode, 1)
        self.assertIn('scenario-build marker', result.stderr)

    def test_present_passes_on_a_bundle_with_the_marker(self):
        bundle = self.write('a.js', b'x;' + MARKER)
        self.assertEqual(run(bundle, '--expect', 'present').returncode, 0)

    def test_present_fails_on_a_bundle_without_the_marker(self):
        bundle = self.write('a.js', b'var a = 1;')
        self.assertEqual(run(bundle, '--expect', 'present').returncode, 1)

    def test_looks_inside_an_ipa_or_apk(self):
        archive = self.path('app.ipa')
        with zipfile.ZipFile(archive, 'w') as z:
            z.writestr('Payload/App.app/main.jsbundle', b'a' + MARKER)
            z.writestr('Payload/App.app/Info.plist', b'plist')
        self.assertEqual(run(archive, '--expect', 'absent').returncode, 1)
        self.assertEqual(run(archive, '--expect', 'present').returncode, 0)

    def test_clean_archive_passes_absent(self):
        archive = self.path('app.apk')
        with zipfile.ZipFile(archive, 'w') as z:
            z.writestr('assets/index.android.bundle', b'var a = 1;')
        self.assertEqual(run(archive, '--expect', 'absent').returncode, 0)

    def test_missing_file_is_an_error_not_a_pass(self):
        result = run(self.path('nope.js'), '--expect', 'absent')
        self.assertEqual(result.returncode, 2)

    def test_expect_is_required(self):
        bundle = self.write('a.js', b'x')
        self.assertNotEqual(run(bundle).returncode, 0)


if __name__ == '__main__':
    unittest.main()
