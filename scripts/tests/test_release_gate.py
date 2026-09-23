"""Release gate: version-bump + CHANGELOG-tag decision, and its git/CLI plumbing."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/ci'))

import release_gate  # noqa: E402


class DecideTests(unittest.TestCase):
    """Pure decision logic: docs/CHANGELOG.md's `[user]`/`[app]` gate whether to release."""

    def test_version_bump_with_user_tag_releases(self):
        self.assertTrue(release_gate.decide((1, 0, 0), (1, 0, 1), {'user'}))

    def test_version_bump_with_app_tag_releases(self):
        self.assertTrue(release_gate.decide((1, 0, 0), (1, 0, 1), {'app'}))

    def test_version_bump_with_only_internal_tags_skips(self):
        for tags in ({'meta'}, {'ci'}, {'test'}, {'wip'}, {'meta', 'wip'}):
            with self.subTest(tags=tags):
                self.assertFalse(release_gate.decide((1, 0, 0), (1, 0, 1), tags))

    def test_no_version_change_skips_regardless_of_tags(self):
        self.assertFalse(release_gate.decide((1, 0, 0), (1, 0, 0), {'user'}))

    def test_version_bump_with_unrecognised_tag_fails_loudly(self):
        with self.assertRaises(release_gate.ReleaseGateError):
            release_gate.decide((1, 0, 0), (1, 0, 1), set())
        with self.assertRaises(release_gate.ReleaseGateError):
            release_gate.decide((1, 0, 0), (1, 0, 1), {'bogus'})

    def test_version_decrease_fails_loudly(self):
        with self.assertRaises(release_gate.ReleaseGateError):
            release_gate.decide((1, 0, 1), (1, 0, 0), {'user'})


class ParseVersionTests(unittest.TestCase):
    def test_parses_semver_string(self):
        self.assertEqual(release_gate.parse_version('{"version": "1.2.3"}'), (1, 2, 3))

    def test_missing_version_field_fails_loudly(self):
        with self.assertRaises(release_gate.ReleaseGateError):
            release_gate.parse_version('{"name": "no-version"}')

    def test_malformed_json_fails_loudly(self):
        with self.assertRaises(release_gate.ReleaseGateError):
            release_gate.parse_version('not json')

    def test_non_numeric_version_fails_loudly(self):
        with self.assertRaises(release_gate.ReleaseGateError):
            release_gate.parse_version('{"version": "1.2.rc1"}')


class ExtractNewestEntryTagsTests(unittest.TestCase):
    def test_single_tag(self):
        text = '# Changelog\n\n## [1.2.0] - 2026-01-01\n\n### Added\n- [user] Did a thing.\n\n## [1.1.0]\n- [meta] Older.\n'
        self.assertEqual(release_gate.extract_newest_entry_tags(text), {'user'})

    def test_multiple_wip_tags_under_unreleased(self):
        text = ('# Changelog\n\n## [Unreleased]\n\n### Added\n'
                '- [wip] CheL-61 (WU1): first.\n- [wip] CheL-61 (WU2): second.\n\n'
                '## [1.0.5]\n- [meta] Older.\n')
        self.assertEqual(release_gate.extract_newest_entry_tags(text), {'wip'})

    def test_ignores_a_template_heading_inside_an_html_comment(self):
        # docs/CHANGELOG.md's real template comment contains a literal
        # "## [X.Y.Z] ..." example line - this must not be mistaken for the
        # first real entry heading.
        text = (
            '# Changelog\n\n'
            '<!-- This file is maintained by the Product Owner agent.\n'
            '     New sections are prepended after each merged PR in the format:\n\n'
            '## [X.Y.Z] — YYYY-MM-DD (PR #N merged)\n\n'
            '### Added / Changed / Fixed\n'
            '- ...\n'
            '-->\n\n'
            '## [0.11.0] — 2026-09-23 (PR #64 merged)\n\n'
            '### Added\n'
            '- [app] First version.\n'
        )
        self.assertEqual(release_gate.extract_newest_entry_tags(text), {'app'})

    def test_no_section_heading_fails_loudly(self):
        with self.assertRaises(release_gate.ReleaseGateError):
            release_gate.extract_newest_entry_tags('# Changelog\n\nNothing here yet.\n')

    def test_section_with_no_tagged_bullets_returns_empty_set(self):
        text = '## [1.0.0]\n\nNo bullets carry a recognised tag here.\n'
        self.assertEqual(release_gate.extract_newest_entry_tags(text), set())


class MainCliTests(unittest.TestCase):
    """End-to-end: main() against a real temporary git repo, matching what CI invokes."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.repo = Path(self.tmp.name)
        self.run_git('init', '-q', '-b', 'main')
        self.run_git('config', 'user.email', 'test@example.com')
        self.run_git('config', 'user.name', 'Test')

    def run_git(self, *args):
        subprocess.run(['git', *args], cwd=self.repo, check=True, capture_output=True)

    def write_and_commit(self, version, changelog_body, message='commit'):
        (self.repo / 'package.json').write_text(json.dumps({'version': version}))
        (self.repo / 'docs').mkdir(exist_ok=True)
        (self.repo / 'docs/CHANGELOG.md').write_text(changelog_body)
        self.run_git('add', '.')
        self.run_git('commit', '-q', '-m', message)

    def run_main(self):
        github_output = self.repo / 'github_output.txt'
        env = dict(os.environ, GITHUB_OUTPUT=str(github_output))
        result = subprocess.run(
            [sys.executable, str(ROOT / 'scripts/ci/release_gate.py')],
            cwd=self.repo, env=env, text=True, capture_output=True,
        )
        outputs = {}
        if github_output.exists():
            for line in github_output.read_text().splitlines():
                key, _, value = line.partition('=')
                outputs[key] = value
        return result, outputs

    def test_user_tagged_version_bump_writes_release_outputs(self):
        self.write_and_commit('1.0.0', '## [1.0.0]\n- [meta] Initial.\n', 'first')
        self.write_and_commit('1.0.1', '## [1.0.1]\n- [user] Ships a thing.\n', 'second')
        result, outputs = self.run_main()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(outputs.get('should_release'), 'true')
        self.assertEqual(outputs.get('version'), '1.0.1')

    def test_wip_tagged_version_bump_skips(self):
        self.write_and_commit('1.0.0', '## [1.0.0]\n- [meta] Initial.\n', 'first')
        self.write_and_commit(
            '1.0.1', '## [Unreleased]\n- [wip] CheL-61 (WU1): first.\n', 'second',
        )
        result, outputs = self.run_main()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(outputs.get('should_release'), 'false')

    def test_first_commit_has_no_parent_fails_loudly(self):
        self.write_and_commit('1.0.0', '## [1.0.0]\n- [user] Initial.\n', 'only commit')
        result, _outputs = self.run_main()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('HEAD^', result.stderr)

    def test_unrecognised_tag_on_version_bump_fails_loudly(self):
        self.write_and_commit('1.0.0', '## [1.0.0]\n- [meta] Initial.\n', 'first')
        self.write_and_commit('1.0.1', '## [1.0.1]\nNo tagged bullet at all.\n', 'second')
        result, _outputs = self.run_main()
        self.assertNotEqual(result.returncode, 0)


if __name__ == '__main__':
    unittest.main()
