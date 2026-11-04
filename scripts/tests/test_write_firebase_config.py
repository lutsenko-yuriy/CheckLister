"""CheL-126: CI writes the Firebase config files from GitHub secrets."""
import base64
import os
from pathlib import Path
import plistlib
import json
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'scripts/ci/write_firebase_config.py'

IOS_PATH = 'ios/CheckLister/GoogleService-Info.plist'
ANDROID_PATH = 'android/app/google-services.json'


def b64(data: bytes) -> str:
    return base64.b64encode(data).decode()


def plist_bytes(bundle_id='com.checklister.checklisterApp'):
    return plistlib.dumps({'BUNDLE_ID': bundle_id, 'PROJECT_ID': 'demo'})


def json_bytes(package='com.checklister'):
    return json.dumps(
        {'client': [{'client_info': {'android_client_info': {'package_name': package}}}]}
    ).encode()


def run(platform, env_name=None, value=None):
    with tempfile.TemporaryDirectory() as root:
        env = {k: v for k, v in os.environ.items() if not k.startswith('GOOGLE_SERVICE')}
        if env_name is not None:
            env[env_name] = value
        proc = subprocess.run(
            [sys.executable, str(SCRIPT), platform, '--root', root],
            env=env, capture_output=True, text=True,
        )
        written = {
            p: (Path(root) / p).read_bytes()
            for p in (IOS_PATH, ANDROID_PATH)
            if (Path(root) / p).exists()
        }
        return proc, written


class WriteFirebaseConfigTests(unittest.TestCase):
    def test_writes_the_decoded_ios_plist(self):
        data = plist_bytes()
        proc, written = run('ios', 'GOOGLE_SERVICE_INFO_PLIST_B64', b64(data))
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(written, {IOS_PATH: data})

    def test_writes_the_decoded_android_json(self):
        data = json_bytes()
        proc, written = run('android', 'GOOGLE_SERVICES_JSON_B64', b64(data))
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(written, {ANDROID_PATH: data})

    def test_line_wrapped_secret_is_decoded(self):
        # `base64` on Linux wraps at 76 columns; a pasted secret may hold newlines.
        data = plist_bytes()
        wrapped = b64(data)
        wrapped = '\n'.join(wrapped[i:i + 20] for i in range(0, len(wrapped), 20)) + '\n'
        proc, written = run('ios', 'GOOGLE_SERVICE_INFO_PLIST_B64', wrapped)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(written, {IOS_PATH: data})

    def test_missing_secret_fails_naming_the_secret(self):
        for platform, name in (
            ('ios', 'GOOGLE_SERVICE_INFO_PLIST_B64'),
            ('android', 'GOOGLE_SERVICES_JSON_B64'),
        ):
            with self.subTest(platform=platform):
                for value in (None, ''):
                    proc, written = run(platform, name if value is not None else None, value)
                    self.assertNotEqual(proc.returncode, 0)
                    self.assertIn(name, proc.stderr)
                    self.assertEqual(written, {})

    def test_invalid_base64_fails(self):
        proc, written = run('ios', 'GOOGLE_SERVICE_INFO_PLIST_B64', '!!not base64!!')
        self.assertNotEqual(proc.returncode, 0)
        self.assertEqual(written, {})

    def test_file_for_another_app_fails(self):
        proc, written = run(
            'ios', 'GOOGLE_SERVICE_INFO_PLIST_B64', b64(plist_bytes('com.other.app'))
        )
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn('com.checklister.checklisterApp', proc.stderr)
        self.assertEqual(written, {})

        proc, written = run(
            'android', 'GOOGLE_SERVICES_JSON_B64', b64(json_bytes('com.other.app'))
        )
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn('com.checklister', proc.stderr)
        self.assertEqual(written, {})

    def test_unparseable_content_fails(self):
        proc, written = run('android', 'GOOGLE_SERVICES_JSON_B64', b64(b'not json'))
        self.assertNotEqual(proc.returncode, 0)
        self.assertEqual(written, {})


if __name__ == '__main__':
    unittest.main()
