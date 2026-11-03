#!/usr/bin/env python3
"""Write the Firebase config file for one platform from a GitHub secret.

`GoogleService-Info.plist` and `google-services.json` are not committed
(CheL-126); CI recreates them before a build from base64-encoded secrets:

    ios      GOOGLE_SERVICE_INFO_PLIST_B64 -> ios/CheckLister/GoogleService-Info.plist
    android  GOOGLE_SERVICES_JSON_B64      -> android/app/google-services.json

Fails loudly on a missing secret (fork PRs get none), bad base64, or a file
registered for a different app, rather than building without Firebase.
"""
import argparse
import base64
import binascii
import json
import os
from pathlib import Path
import plistlib
import sys

IOS_BUNDLE_ID = 'com.checklister.checklisterApp'
ANDROID_PACKAGE = 'com.checklister'


class ConfigError(Exception):
    """Raised when the secret is absent or doesn't hold this app's config."""


def check_ios(data: bytes) -> None:
    try:
        bundle_id = plistlib.loads(data).get('BUNDLE_ID')
    except Exception as err:
        raise ConfigError(f'not a valid plist: {err}')
    if bundle_id != IOS_BUNDLE_ID:
        raise ConfigError(f'BUNDLE_ID is {bundle_id!r}, expected {IOS_BUNDLE_ID}')


def check_android(data: bytes) -> None:
    try:
        clients = json.loads(data)['client']
        packages = {c['client_info']['android_client_info']['package_name'] for c in clients}
    except Exception as err:
        raise ConfigError(f'not a valid google-services.json: {err!r}')
    if ANDROID_PACKAGE not in packages:
        raise ConfigError(f'package names are {sorted(packages)}, expected {ANDROID_PACKAGE}')


PLATFORMS = {
    'ios': ('GOOGLE_SERVICE_INFO_PLIST_B64', 'ios/CheckLister/GoogleService-Info.plist', check_ios),
    'android': ('GOOGLE_SERVICES_JSON_B64', 'android/app/google-services.json', check_android),
}


def write_config(platform: str, root: Path) -> Path:
    secret, relative, check = PLATFORMS[platform]
    encoded = os.environ.get(secret, '')
    if not encoded.strip():
        raise ConfigError(f'secret {secret} is empty or not set')
    try:
        data = base64.b64decode(encoded, validate=True)
    except binascii.Error as err:
        raise ConfigError(f'{secret} is not valid base64: {err}')
    check(data)
    target = root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return target


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('platform', choices=sorted(PLATFORMS))
    parser.add_argument('--root', type=Path, default=Path.cwd())
    args = parser.parse_args(argv)
    try:
        target = write_config(args.platform, args.root)
    except ConfigError as err:
        print(f'error: {err}', file=sys.stderr)
        return 1
    print(f'wrote {target}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
