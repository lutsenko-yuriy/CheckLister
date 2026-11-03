#!/usr/bin/env python3
"""Decide whether the latest push touched an app-affecting path (CheL-115).

A workflow's `paths:` filter on `pull_request` is evaluated against the whole PR
diff, so a docs-only push to a PR that already touches app code re-runs the
emulator suite. This script diffs only the latest push (BEFORE..SHA) against the
workflow's own `paths:` list and writes `run=true|false` to GITHUB_OUTPUT.

Anything it can't narrow down (no BEFORE, unreachable commit, a git error) runs.
"""
import fnmatch
import os
from pathlib import Path
import re
import subprocess
import sys

ZERO_SHA = '0' * 40


def app_paths(workflow_text: str) -> list:
    """The first `paths:` list in the workflow (the anchored app-paths block)."""
    block = re.search(r'paths:[^\n]*\n((?:\s+-\s+.+\n)+)', workflow_text)
    if not block:
        raise ValueError('no paths: list in workflow')
    return [m.strip().strip("'\"") for m in re.findall(r'-\s+(.+)', block.group(1))]


def matches(path: str, patterns: list) -> bool:
    for pattern in patterns:
        if pattern.endswith('/**'):
            if path.startswith(pattern[:-2]):
                return True
        elif fnmatch.fnmatchcase(path, pattern):
            return True
    return False


def should_run(changed: list, patterns: list) -> bool:
    return any(matches(p, patterns) for p in changed)


def changed_files(before: str, sha: str) -> list:
    out = subprocess.run(['git', 'diff', '--name-only', before, sha],
                         check=True, capture_output=True, text=True).stdout
    return out.split()


def main(argv: list) -> int:
    workflow, before, sha = argv[1:4]
    run = True
    if before and before != ZERO_SHA:
        try:
            run = should_run(changed_files(before, sha), app_paths(Path(workflow).read_text()))
        except (subprocess.CalledProcessError, ValueError) as err:
            print(f'cannot narrow the diff ({err}); running', file=sys.stderr)
    print(f'app paths touched by this push: {run}')
    out = os.environ.get('GITHUB_OUTPUT')
    if out:
        with open(out, 'a') as fh:
            fh.write(f'run={"true" if run else "false"}\n')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
