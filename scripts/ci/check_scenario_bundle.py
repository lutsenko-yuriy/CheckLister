#!/usr/bin/env python3
"""Fail if a build does (or does not) contain the scenario-build marker (CheL-147).

The marker string lives in src/scenarios/scenarioBuildMarker.ts and is only
bundled when __SCENARIO_BUILD__ is on. `--expect absent` guards the TestFlight
build and the PR "stripping" job; `--expect present` proves the check can
actually see the marker. PATH is a JS bundle or an .ipa/.apk/.zip, whose
entries are all scanned.
"""
import argparse
import sys
import zipfile

MARKER = b'checklister-scenario-build-marker'


def contains_marker(path):
    if zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as archive:
            return any(MARKER in archive.read(name) for name in archive.namelist())
    with open(path, 'rb') as f:
        return MARKER in f.read()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('path')
    parser.add_argument('--expect', required=True, choices=['absent', 'present'])
    args = parser.parse_args(argv)

    try:
        found = contains_marker(args.path)
    except OSError as error:
        print(f'cannot read {args.path}: {error}', file=sys.stderr)
        return 2

    if args.expect == 'absent' and found:
        print(f'{args.path} contains the scenario-build marker; a scenario build '
              'must never reach testers or users.', file=sys.stderr)
        return 1
    if args.expect == 'present' and not found:
        print(f'{args.path} lacks the scenario-build marker; the flag did not '
              'reach the bundle.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
