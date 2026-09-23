#!/usr/bin/env python3
"""Decide whether the current main commit should trigger a signed TestFlight
release build.

package.json's `version` stays the single source of truth for what
`ship` bumps; this script never writes it. A release fires only when BOTH:
  1. the version changed since the previous commit, and
  2. the newest docs/CHANGELOG.md section's tags include `[user]` or `[app]`
     (see docs/workflows/MULTI_WU.md's CHANGELOG-tag rules).
Anything else that can't be classified fails loudly rather than silently
skipping, since a release pipeline that quietly does nothing is worse than
one that stops and says why.
"""
import json
import os
import re
import subprocess
import sys

RELEASE_TAGS = {'user', 'app'}
NO_RELEASE_TAGS = {'test', 'meta', 'ci', 'wip', 'non-user'}


class ReleaseGateError(Exception):
    """Raised when repository state can't be classified - never silently skip."""


def git_show(ref, path, cwd=None):
    result = subprocess.run(
        ['git', 'show', f'{ref}:{path}'],
        cwd=cwd, capture_output=True, text=True,
    )
    if result.returncode != 0:
        hint = ''
        if ref == 'HEAD^':
            hint = (' - if this is a shallow checkout, increase the workflow\'s '
                    '`fetch-depth` to at least 2')
        raise ReleaseGateError(
            f'git show {ref}:{path} failed: {result.stderr.strip()}{hint}'
        )
    return result.stdout


def parse_version(text):
    try:
        version = json.loads(text)['version']
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        raise ReleaseGateError(f'could not read package.json version: {exc}') from exc
    try:
        return tuple(int(part) for part in version.split('.'))
    except ValueError as exc:
        raise ReleaseGateError(f'unparseable version string {version!r}') from exc


def extract_newest_entry_tags(changelog_text):
    """Tags on the newest `## [...]` section's bullet lines, e.g. '- [user] ...'.

    HTML comments are stripped first - docs/CHANGELOG.md's own template
    comment contains a literal "## [X.Y.Z] ..." example heading that must
    not be mistaken for a real entry.
    """
    changelog_text = re.sub(r'<!--.*?-->', '', changelog_text, flags=re.DOTALL)
    lines = changelog_text.splitlines()
    start = None
    end = len(lines)
    for index, line in enumerate(lines):
        if line.startswith('## '):
            if start is None:
                start = index
            else:
                end = index
                break
    if start is None:
        raise ReleaseGateError('no "## [...]" section found in docs/CHANGELOG.md')
    tags = set()
    for line in lines[start:end]:
        match = re.match(r'^\s*-\s*\[([\w-]+)\]', line)
        if match:
            tags.add(match.group(1))
    return tags


def decide(version_before, version_after, tags):
    """Returns True (release) / False (skip); raises ReleaseGateError to fail loudly."""
    if version_after < version_before:
        before_str = '.'.join(map(str, version_before))
        after_str = '.'.join(map(str, version_after))
        raise ReleaseGateError(
            f'version decreased ({before_str} -> {after_str}) - '
            'looks like a bad merge or revert, not a release'
        )
    if version_after == version_before:
        return False
    if tags & RELEASE_TAGS:
        return True
    if tags & NO_RELEASE_TAGS:
        return False
    raise ReleaseGateError(
        'version changed but the newest CHANGELOG entry carries no recognised tag '
        f'(found: {sorted(tags) or "none"}) - classify it with '
        '[user]/[app]/[test]/[meta]/[ci]/[wip] per docs/workflows/MULTI_WU.md'
    )


def main():
    try:
        version_before = parse_version(git_show('HEAD^', 'package.json'))
        version_after = parse_version(git_show('HEAD', 'package.json'))
        tags = extract_newest_entry_tags(git_show('HEAD', 'docs/CHANGELOG.md'))
        should_release = decide(version_before, version_after, tags)
    except ReleaseGateError as exc:
        print(f'release gate: {exc}', file=sys.stderr)
        return 1

    version_string = '.'.join(str(part) for part in version_after)
    lines = [
        f'should_release={"true" if should_release else "false"}',
        f'version={version_string}',
    ]
    output_path = os.environ.get('GITHUB_OUTPUT')
    if output_path:
        with open(output_path, 'a', encoding='utf-8') as handle:
            handle.write('\n'.join(lines) + '\n')
    print('\n'.join(lines))
    return 0


if __name__ == '__main__':
    sys.exit(main())
