"""Every top-level .maestro flow must declare a non-empty, valid platform tag set."""
from pathlib import Path
import unittest

import yaml

ROOT = Path(__file__).resolve().parents[2]
MAESTRO_DIR = ROOT / '.maestro'
VALID_TAGS = {'ios', 'android'}


def top_level_flows():
    return sorted(p for p in MAESTRO_DIR.glob('*.yaml') if p.is_file())


def read_header(path):
    text = path.read_text()
    header_text = text.split('\n---\n', 1)[0]
    return yaml.safe_load(header_text)


class MaestroFlowTagTests(unittest.TestCase):
    def test_at_least_one_top_level_flow_exists(self):
        self.assertTrue(top_level_flows())

    def test_every_top_level_flow_declares_valid_nonempty_tags(self):
        for flow in top_level_flows():
            with self.subTest(flow=flow.name):
                header = read_header(flow)
                tags = header.get('tags')
                self.assertIsInstance(tags, list, f'{flow.name} is missing a tags: list')
                self.assertTrue(tags, f'{flow.name} has an empty tags: list')
                self.assertTrue(set(tags) <= VALID_TAGS,
                                 f'{flow.name} has unknown tags: {set(tags) - VALID_TAGS}')

    def test_every_top_level_flow_uses_app_id_variable(self):
        for flow in top_level_flows():
            with self.subTest(flow=flow.name):
                header = read_header(flow)
                self.assertEqual(header.get('appId'), '${APP_ID}',
                                  f'{flow.name} must use appId: ${{APP_ID}}, not a hardcoded bundle id')


if __name__ == '__main__':
    unittest.main()
