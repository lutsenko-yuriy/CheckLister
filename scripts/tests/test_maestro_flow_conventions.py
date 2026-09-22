"""Maestro flow header conventions: every flow uses ${APP_ID}; every top-level
flow declares a valid, non-empty platform tags: list. Stdlib-only (no PyYAML),
matching every other script under scripts/ — see scripts/skill_router/core/frontmatter.py
for the same header-parsing approach.
"""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[2]
MAESTRO_DIR = ROOT / '.maestro'
VALID_TAGS = {'ios', 'android'}

APP_ID_RE = re.compile(r'^appId:\s*(\S+)\s*$', re.MULTILINE)
TAGS_BLOCK_RE = re.compile(r'^tags:\s*\n((?:^[ \t]*-[ \t]*\S+[ \t]*\n?)*)', re.MULTILINE)
TAG_ITEM_RE = re.compile(r'^[ \t]*-[ \t]*(\S+)[ \t]*$', re.MULTILINE)


def all_flows():
    return sorted(p for p in MAESTRO_DIR.glob('**/*.y*ml') if p.is_file())


def top_level_flows():
    return sorted(p for p in MAESTRO_DIR.glob('*.y*ml') if p.is_file())


def read_header(path):
    text = path.read_text()
    m = re.search(r'^---\s*$', text, re.MULTILINE)
    return text[:m.start()] if m else text


def get_app_id(header):
    m = APP_ID_RE.search(header)
    return m.group(1) if m else None


def get_tags(header):
    m = TAGS_BLOCK_RE.search(header)
    if not m:
        return None
    return TAG_ITEM_RE.findall(m.group(1))


class MaestroFlowConventionTests(unittest.TestCase):
    def test_at_least_one_top_level_flow_exists(self):
        self.assertTrue(top_level_flows())

    def test_every_flow_uses_app_id_variable(self):
        flows = all_flows()
        self.assertTrue(flows)
        for flow in flows:
            with self.subTest(flow=str(flow.relative_to(MAESTRO_DIR))):
                self.assertEqual(get_app_id(read_header(flow)), '${APP_ID}',
                                  f'{flow} must use appId: ${{APP_ID}}, not a hardcoded bundle id')

    def test_every_top_level_flow_declares_valid_nonempty_tags(self):
        for flow in top_level_flows():
            with self.subTest(flow=flow.name):
                tags = get_tags(read_header(flow))
                self.assertIsNotNone(tags, f'{flow.name} is missing a tags: list')
                self.assertTrue(tags, f'{flow.name} has an empty tags: list')
                self.assertTrue(set(tags) <= VALID_TAGS,
                                 f'{flow.name} has unknown tags: {set(tags) - VALID_TAGS}')


if __name__ == '__main__':
    unittest.main()
