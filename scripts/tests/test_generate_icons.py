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


def _png_dimensions_and_color_type(path: Path) -> tuple[int, int, int]:
    """Read (width, height, color_type) from a PNG's IHDR chunk, no Pillow needed."""
    header = path.read_bytes()[:33]
    width = int.from_bytes(header[16:20], 'big')
    height = int.from_bytes(header[20:24], 'big')
    color_type = header[25]
    return width, height, color_type


class GeneratedOutputTests(unittest.TestCase):
    def setUp(self):
        self.images = json.loads((ICONSET / 'Contents.json').read_text())['images']

    def test_every_ios_slot_references_an_existing_png(self):
        for entry in self.images:
            with self.subTest(size=entry['size'], filename=entry.get('filename')):
                self.assertIn('filename', entry)
                self.assertTrue((ICONSET / entry['filename']).is_file())

    def test_appiconset_is_single_size_mode(self):
        # Per-appearance icons (dark/tinted) are only honored by Xcode/actool
        # when every entry omits `scale` — that's what puts the catalog in
        # Single Size mode, where Xcode derives every smaller size at build
        # time instead of reading committed per-size PNGs.
        for entry in self.images:
            with self.subTest(filename=entry.get('filename')):
                self.assertNotIn('scale', entry)

    def test_exactly_one_default_and_one_dark_appearance_slot(self):
        default_slots = [e for e in self.images if 'appearances' not in e]
        dark_slots = [
            e for e in self.images
            if e.get('appearances') == [{'appearance': 'luminosity', 'value': 'dark'}]
        ]
        self.assertEqual(len(default_slots), 1)
        self.assertEqual(len(dark_slots), 1)
        self.assertNotEqual(default_slots[0]['filename'], dark_slots[0]['filename'])

    def test_default_icon_is_opaque_and_dark_icon_is_transparent(self):
        # App Store validation rejects a transparent default icon; a fully
        # opaque dark icon silently defeats the point of this ticket (the
        # system can't composite its own dark backdrop behind it).
        default_entry = next(e for e in self.images if 'appearances' not in e)
        dark_entry = next(
            e for e in self.images
            if e.get('appearances') == [{'appearance': 'luminosity', 'value': 'dark'}]
        )
        _, _, default_color_type = _png_dimensions_and_color_type(ICONSET / default_entry['filename'])
        _, _, dark_color_type = _png_dimensions_and_color_type(ICONSET / dark_entry['filename'])
        # PNG color type: 2 = truecolor (no alpha), 6 = truecolor with alpha.
        self.assertEqual(default_color_type, 2)
        self.assertEqual(dark_color_type, 6)

    def test_both_ios_slots_are_1024_square(self):
        for entry in self.images:
            with self.subTest(filename=entry['filename']):
                width, height, _ = _png_dimensions_and_color_type(ICONSET / entry['filename'])
                self.assertEqual((width, height), (1024, 1024))

    def test_every_android_density_has_all_launcher_pngs(self):
        for density in ('mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'):
            for name in ('ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground'):
                with self.subTest(density=density, name=name):
                    self.assertTrue((ANDROID_RES / f'mipmap-{density}/{name}.png').is_file())


if __name__ == '__main__':
    unittest.main()
