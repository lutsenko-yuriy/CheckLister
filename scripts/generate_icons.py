#!/usr/bin/env python3
"""generate_icons.py — Render the app icon PNGs from assets/icon/icon.svg.

Writes every size the iOS asset catalog (AppIcon.appiconset) and the Android
launcher mipmaps need. Re-run after editing the SVG and commit the output.

iOS icons are full-bleed and opaque (the OS applies its own corner mask and
rejects alpha on the marketing icon).

Android gets two sets:
- Adaptive icon (API 26+, mipmap-anydpi-v26): a transparent foreground layer
  with the art shrunk into the launcher safe zone, over the gradient in
  drawable/ic_launcher_background.xml. The same foreground doubles as the
  monochrome layer for themed icons (API 33+), which only uses its alpha.
- Legacy fallback (ic_launcher / ic_launcher_round per density) with the shape
  baked in: a rounded square and a circle.

The SVG's element ids (background, art, box, halo, check) are this script's
contract with the artwork — keep them when editing the SVG.

Requires: pip install cairosvg pillow

Usage:
    python3 scripts/generate_icons.py
"""

from __future__ import annotations

import copy
import io
import json
import xml.etree.ElementTree as ET
from pathlib import Path

import cairosvg
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SVG_PATH = ROOT / 'assets/icon/icon.svg'
IOS_ICONSET = ROOT / 'ios/CheckLister/Images.xcassets/AppIcon.appiconset'
ANDROID_RES = ROOT / 'android/app/src/main/res'

SVG_NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG_NS)

# Legacy launcher icon edge per density (48dp); adaptive layers are 108dp.
ANDROID_DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
LEGACY_DP = 48
ADAPTIVE_DP = 108
# Art scale for the adaptive foreground: keeps the check tip inside the 72dp
# circle that the roundest launcher masks leave visible.
ADAPTIVE_ART_SCALE = 0.68
# Art scale for the legacy round icon, so the circle doesn't clip the check tip.
ROUND_ART_SCALE = 0.86
# Rounded-square corner radius as a fraction of the icon size.
SQUARE_CORNER_RATIO = 0.18
# Rendered at this multiple of the target size, then downsampled, for smoother masks.
SUPERSAMPLE = 4


class Artwork:
    def __init__(self, svg: str):
        self.tree = ET.fromstring(svg)

    def variant(self, keep: set[str] | None = None, art_scale: float = 1.0) -> str:
        """The SVG with only the `keep` ids drawn (all if None), art scaled around the center."""
        root = copy.deepcopy(self.tree)
        for parent in list(root.iter()):
            for child in list(parent):
                element_id = child.get('id')
                if keep is not None and element_id in {'background', 'box', 'halo', 'check'} - keep:
                    parent.remove(child)
        if art_scale != 1.0:
            offset = 512 * (1 - art_scale)
            art = root.find(f".//{{{SVG_NS}}}g[@id='art']")
            art.set('transform', f'translate({offset:g},{offset:g}) scale({art_scale:g})')
        return ET.tostring(root, encoding='unicode')


def render(svg: str, size: int) -> Image.Image:
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=size, output_height=size)
    return Image.open(io.BytesIO(png)).convert('RGBA')


def masked(image: Image.Image, draw_shape) -> Image.Image:
    mask = Image.new('L', image.size, 0)
    draw_shape(ImageDraw.Draw(mask), image.size[0])
    image.putalpha(ImageChops.multiply(image.getchannel('A'), mask))
    return image


def foreground(artwork: Artwork, size: int) -> Image.Image:
    """Box and check on transparency, with a transparent gap where the halo would be."""
    box = render(artwork.variant({'box'}, ADAPTIVE_ART_SCALE), size)
    halo = render(artwork.variant({'halo'}, ADAPTIVE_ART_SCALE), size).getchannel('A')
    box.putalpha(ImageChops.subtract(box.getchannel('A'), halo))
    return Image.alpha_composite(box, render(artwork.variant({'check'}, ADAPTIVE_ART_SCALE), size))


def write_ios(artwork: Artwork) -> None:
    svg = artwork.variant()
    contents = json.loads((IOS_ICONSET / 'Contents.json').read_text())
    for entry in contents['images']:
        points = float(entry['size'].split('x')[0])
        scale = int(entry['scale'].rstrip('x'))
        pixels = round(points * scale)
        filename = f'icon-{pixels}.png'
        render(svg, pixels).convert('RGB').save(IOS_ICONSET / filename)
        entry['filename'] = filename
    (IOS_ICONSET / 'Contents.json').write_text(json.dumps(contents, indent=2) + '\n')


def write_android(artwork: Artwork) -> None:
    full_svg = artwork.variant()
    round_svg = artwork.variant(art_scale=ROUND_ART_SCALE)
    for density, factor in ANDROID_DENSITIES.items():
        out_dir = ANDROID_RES / f'mipmap-{density}'
        size = round(LEGACY_DP * factor)
        big = size * SUPERSAMPLE
        square = masked(
            render(full_svg, big),
            lambda d, s: d.rounded_rectangle((0, 0, s - 1, s - 1), radius=s * SQUARE_CORNER_RATIO, fill=255),
        )
        circle = masked(render(round_svg, big), lambda d, s: d.ellipse((0, 0, s - 1, s - 1), fill=255))
        square.resize((size, size), Image.LANCZOS).save(out_dir / 'ic_launcher.png')
        circle.resize((size, size), Image.LANCZOS).save(out_dir / 'ic_launcher_round.png')
        foreground(artwork, round(ADAPTIVE_DP * factor)).save(out_dir / 'ic_launcher_foreground.png')


def main() -> None:
    artwork = Artwork(SVG_PATH.read_text())
    write_ios(artwork)
    write_android(artwork)


if __name__ == '__main__':
    main()
