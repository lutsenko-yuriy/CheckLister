import os
import unittest

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')


def read(*parts):
    with open(os.path.join(ROOT, *parts)) as f:
        return f.read()


class ScenarioBuildGuardsTest(unittest.TestCase):
    def test_testflight_lane_refuses_the_flag_and_checks_the_archive(self):
        lane = read('fastlane', 'Fastfile')
        beta = lane[lane.index('lane :beta'):]
        self.assertIn("ENV.fetch('CHECKLISTER_SCENARIO_BUILD'", beta)
        self.assertIn('check_scenario_bundle.py', beta)
        self.assertIn('--expect absent', beta)
        # the archive check must run before anything is uploaded
        self.assertLess(beta.index('check_scenario_bundle.py'), beta.index('pilot('))

    def test_pr_validation_checks_both_directions(self):
        workflow = read('.github', 'workflows', 'pr-validation.yml')
        self.assertIn('--expect absent', workflow)
        self.assertIn('--expect present', workflow)
        self.assertIn("CHECKLISTER_SCENARIO_BUILD: '1'", workflow)


if __name__ == '__main__':
    unittest.main()
