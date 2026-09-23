"""App icon: the SVG element-id contract scripts/generate_icons.py depends on.

Stdlib only — CI doesn't install cairosvg/Pillow, so this checks the SVG and the
generated outputs' presence rather than importing the generator.
"""
import json
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SVG_NS = '{http://www.w3.org/2000/svg}'
ICONSET = ROOT / 'ios/CheckLister/Images.xcassets/AppIcon.appiconset'
ANDROID_RES = ROOT / 'android/app/src/main/res'


class SvgContractTests(unittest.TestCase):
    def setUp(self):
        self.root = ET.parse(ROOT / 'assets/icon/icon.svg').getroot()
        self.by_id = {el.get('id'): el for el in self.root.iter() if el.get('id')}

    def test_svg_has_every_layer_id_the_generator_uses(self):
        for element_id in ('background', 'art', 'box', 'halo', 'check'):
            with self.subTest(id=element_id):
                self.assertIn(element_id, self.by_id)

    def test_art_is_a_group_holding_the_foreground_layers(self):
        art = self.by_id['art']
        self.assertEqual(art.tag, f'{SVG_NS}g')
        descendant_ids = {el.get('id') for el in art.iter()}
        self.assertTrue({'box', 'halo', 'check'} <= descendant_ids)

    def test_background_sits_outside_art_so_scaling_keeps_it_full_bleed(self):
        self.assertNotIn('background', {el.get('id') for el in self.by_id['art'].iter()})


class GeneratedOutputTests(unittest.TestCase):
    def test_every_ios_slot_references_an_existing_png(self):
        images = json.loads((ICONSET / 'Contents.json').read_text())['images']
        for entry in images:
            with self.subTest(size=entry['size'], scale=entry['scale']):
                self.assertIn('filename', entry)
                self.assertTrue((ICONSET / entry['filename']).is_file())

    def test_every_android_density_has_all_launcher_pngs(self):
        for density in ('mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'):
            for name in ('ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground'):
                with self.subTest(density=density, name=name):
                    self.assertTrue((ANDROID_RES / f'mipmap-{density}/{name}.png').is_file())


if __name__ == '__main__':
    unittest.main()
