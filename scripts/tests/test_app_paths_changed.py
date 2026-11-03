"""CheL-115: the latest push only runs the emulator suite when it touched app paths."""
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts' / 'ci'))
import app_paths_changed as apc  # noqa: E402

WORKFLOW = (ROOT / '.github' / 'workflows' / 'scenarios-android.yml').read_text()


class AppPathsChangedTests(unittest.TestCase):
    def setUp(self):
        self.patterns = apc.app_paths(WORKFLOW)

    def test_reads_the_workflows_app_paths(self):
        self.assertIn('src/**', self.patterns)
        self.assertIn('scripts/scenarios-android*.sh', self.patterns)

    def test_docs_only_push_does_not_run(self):
        self.assertFalse(apc.should_run(['docs/CHANGELOG.md', 'README.md'], self.patterns))

    def test_source_change_runs(self):
        self.assertTrue(apc.should_run(['docs/CHANGELOG.md', 'src/App/Home.tsx'], self.patterns))

    def test_maestro_flow_change_runs(self):
        self.assertTrue(apc.should_run(['.maestro/run.yaml'], self.patterns))

    def test_glob_in_filename_matches(self):
        self.assertTrue(apc.should_run(['scripts/scenarios-android-snapshot.sh'], self.patterns))

    def test_prefix_does_not_match_sibling_directory(self):
        self.assertFalse(apc.should_run(['srcs/x.ts', 'androidx/y'], self.patterns))

    def test_empty_diff_does_not_run(self):
        self.assertFalse(apc.should_run([], self.patterns))


if __name__ == '__main__':
    unittest.main()
