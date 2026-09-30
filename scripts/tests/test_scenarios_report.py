"""Scenario report (CheL-100): Maestro JUnit → run-page summary table and README badge."""
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/ci'))

import scenarios_report  # noqa: E402

REPORT = """<?xml version='1.0' encoding='UTF-8'?>
<testsuites>
  <testsuite name="Test Suite" device="test" tests="2" failures="1" time="100.0">
    <testcase id="Complete a run" name="Complete a run" file=".maestro/run-complete.yaml" time="99.9" status="SUCCESS"/>
    <testcase id="Run history" name="Run history" file=".maestro/run-history.yaml" time="0.1" status="ERROR">
      <failure>Unknown error</failure>
    </testcase>
  </testsuite>
</testsuites>
"""


def write_report(root, text=REPORT, subdir='run-abc'):
    path = Path(root) / subdir / 'report.xml'
    path.parent.mkdir(parents=True)
    path.write_text(text)
    return path


class LoadResultsTests(unittest.TestCase):
    def test_reads_every_flow_with_status_file_and_time(self):
        with tempfile.TemporaryDirectory() as root:
            write_report(root)
            results = scenarios_report.load_results(root)
        self.assertEqual(results, [
            {'name': 'Complete a run', 'file': '.maestro/run-complete.yaml', 'seconds': 99.9, 'passed': True},
            {'name': 'Run history', 'file': '.maestro/run-history.yaml', 'seconds': 0.1, 'passed': False},
        ])

    def test_missing_report_yields_no_results(self):
        with tempfile.TemporaryDirectory() as root:
            self.assertEqual(scenarios_report.load_results(root), [])

    def test_missing_artifacts_dir_yields_no_results(self):
        self.assertEqual(scenarios_report.load_results('/nonexistent/scenarios'), [])


class SummaryTests(unittest.TestCase):
    def test_lists_each_flow_with_its_outcome(self):
        md = scenarios_report.summary_markdown([
            {'name': 'Complete a run', 'file': '.maestro/run-complete.yaml', 'seconds': 99.9, 'passed': True},
            {'name': 'Run history', 'file': '.maestro/run-history.yaml', 'seconds': 0.1, 'passed': False},
        ])
        self.assertIn('❌ 1 of 2 failed', md)
        self.assertIn('| ✅ | Complete a run | `.maestro/run-complete.yaml` | 1m 40s |', md)
        self.assertIn('| ❌ | Run history | `.maestro/run-history.yaml` | 0s |', md)

    def test_all_passing(self):
        md = scenarios_report.summary_markdown([
            {'name': 'A', 'file': 'a.yaml', 'seconds': 5, 'passed': True},
        ])
        self.assertIn('✅ 1/1 passed', md)

    def test_no_results_is_called_out_not_shown_as_green(self):
        self.assertIn('⚠️ no results', scenarios_report.summary_markdown([]))


class BadgeTests(unittest.TestCase):
    def test_all_passing_is_green(self):
        self.assertEqual(
            scenarios_report.badge([{'passed': True}, {'passed': True}]),
            {'schemaVersion': 1, 'label': 'scenarios', 'message': '2/2 passed', 'color': 'brightgreen'})

    def test_any_failure_is_red(self):
        self.assertEqual(
            scenarios_report.badge([{'passed': True}, {'passed': False}])['color'], 'red')
        self.assertEqual(
            scenarios_report.badge([{'passed': True}, {'passed': False}])['message'], '1/2 passed')

    def test_no_results_is_grey_not_green(self):
        self.assertEqual(
            scenarios_report.badge([]),
            {'schemaVersion': 1, 'label': 'scenarios', 'message': 'no results', 'color': 'lightgrey'})


class CliTests(unittest.TestCase):
    def test_summary_appends_to_github_step_summary(self):
        with tempfile.TemporaryDirectory() as root:
            write_report(root)
            summary = Path(root) / 'summary.md'
            summary.write_text('existing\n')
            with mock.patch.dict(os.environ, {'GITHUB_STEP_SUMMARY': str(summary)}):
                code = scenarios_report.main(['summary', root])
            text = summary.read_text()
        self.assertEqual(code, 0)
        self.assertTrue(text.startswith('existing\n'))
        self.assertIn('Run history', text)

    def test_badge_skips_cleanly_without_gist_credentials(self):
        with tempfile.TemporaryDirectory() as root, \
                mock.patch.dict(os.environ, {}, clear=True), \
                mock.patch.object(scenarios_report, 'patch_gist') as patch_gist:
            code = scenarios_report.main(['badge', root])
        self.assertEqual(code, 0)
        patch_gist.assert_not_called()

    def test_badge_patches_the_gist_with_shields_json(self):
        with tempfile.TemporaryDirectory() as root, \
                mock.patch.dict(os.environ, {'GIST_TOKEN': 't', 'GIST_ID': 'g'}, clear=True), \
                mock.patch.object(scenarios_report, 'patch_gist') as patch_gist:
            write_report(root)
            code = scenarios_report.main(['badge', root])
        self.assertEqual(code, 0)
        patch_gist.assert_called_once_with('g', 't', {
            'schemaVersion': 1, 'label': 'scenarios', 'message': '1/2 passed', 'color': 'red'})

    def test_badge_update_failure_warns_without_failing_the_job(self):
        with tempfile.TemporaryDirectory() as root, \
                mock.patch.dict(os.environ, {'GIST_TOKEN': 't', 'GIST_ID': 'g'}, clear=True), \
                mock.patch.object(scenarios_report, 'patch_gist', side_effect=OSError('boom')):
            code = scenarios_report.main(['badge', root])
        self.assertEqual(code, 0)


if __name__ == '__main__':
    unittest.main()
