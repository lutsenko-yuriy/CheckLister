"""Contract for .github/workflows/scenarios-android.yml (CheL-100): pins the
invariants the CI run depends on. Stdlib-only (no PyYAML), matching
test_maestro_flow_conventions.py's regex approach.
"""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / '.github' / 'workflows' / 'scenarios-android.yml'

STEP_START_RE = re.compile(r'^\s*-\s+(?=(?:name|uses|run|id|if):)', re.MULTILINE)


def read_workflow():
    return WORKFLOW.read_text()


def steps(text):
    starts = [m.start() for m in STEP_START_RE.finditer(text)]
    return [text[a:b] for a, b in zip(starts, starts[1:] + [len(text)])]


def step_using(text, action):
    matches = [s for s in steps(text) if re.search(rf'uses:\s*{re.escape(action)}@', s)]
    return matches[0] if matches else None


class AndroidScenariosWorkflowTests(unittest.TestCase):
    def test_workflow_file_exists(self):
        self.assertTrue(WORKFLOW.is_file(), f'{WORKFLOW} is missing')

    def test_runs_on_pull_requests_and_manual_dispatch(self):
        text = read_workflow()
        self.assertRegex(text, r'(?m)^\s+pull_request:')
        # FEATURE.md step 10.6 re-dispatches via `gh workflow run`.
        self.assertRegex(text, r'(?m)^\s+workflow_dispatch:')

    def test_emulator_uses_google_apis_image_never_play_store(self):
        # docs/CONSTRAINTS.md: snapshot isolation needs adb root, which Play images refuse.
        step = step_using(read_workflow(), 'reactivecircus/android-emulator-runner')
        self.assertIsNotNone(step, 'no android-emulator-runner step')
        self.assertRegex(step, r'(?m)^\s+target:\s*google_apis\s*$')
        self.assertNotIn('playstore', step)

    def test_emulator_matches_local_baseline_avd(self):
        step = step_using(read_workflow(), 'reactivecircus/android-emulator-runner')
        self.assertIsNotNone(step, 'no android-emulator-runner step')
        self.assertRegex(step, r'(?m)^\s+arch:\s*x86_64\s*$')
        self.assertRegex(step, r'(?m)^\s+api-level:\s*36\s*$')
        self.assertRegex(step, r'(?m)^\s+profile:\s*pixel_5\s*$')
        # Local baselines and #110's timing tuning all ran with animations on.
        self.assertRegex(step, r'(?m)^\s+disable-animations:\s*false\s*$')

    def test_suite_runs_through_the_npm_runner_not_raw_maestro(self):
        step = step_using(read_workflow(), 'reactivecircus/android-emulator-runner')
        self.assertIsNotNone(step, 'no android-emulator-runner step')
        self.assertIn('npm run scenarios:android -- emulator-5554', step)
        self.assertNotRegex(read_workflow(), r'maestro\s+(?:--device\s+\S+\s+)?test')

    def test_artifacts_upload_even_when_the_suite_fails(self):
        step = step_using(read_workflow(), 'actions/upload-artifact')
        self.assertIsNotNone(step, 'no upload-artifact step')
        self.assertRegex(step, r'(?m)^\s+if:\s*always\(\)\s*$')

    def test_failed_suite_dumps_logcat_into_artifacts_after_the_run(self):
        # Diagnostics only after Maestro exits — never alongside it (docs/CONSTRAINTS.md).
        step = step_using(read_workflow(), 'reactivecircus/android-emulator-runner')
        self.assertIsNotNone(step, 'no android-emulator-runner step')
        self.assertRegex(
            step,
            r'npm run scenarios:android -- emulator-5554 \|\| \{ adb logcat -d > "\$SCENARIOS_ARTIFACTS_DIR/logcat\.txt"; exit 1; \}')

    def test_job_has_a_timeout(self):
        self.assertRegex(read_workflow(), r'(?m)^\s+timeout-minutes:\s*\d+\s*$')


if __name__ == '__main__':
    unittest.main()
