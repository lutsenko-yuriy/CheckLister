#!/usr/bin/env python3
"""generate_icons.py — Render the app icon PNGs from assets/icon/icon.svg.

Writes every size the iOS asset catalog (AppIcon.appiconset) and the Android
launcher mipmaps need. Re-run after editing the SVG and commit the output.

iOS icons are full-bleed and opaque (the OS applies its own corner mask and
rejects alpha on the marketing icon). Android legacy launcher icons get their
shape baked in: a rounded square for ic_launcher, a circle for
ic_launcher_round, with the artwork shrunk so the check tip isn't clipped.

Requires: pip install cairosvg pillow

Usage:
    python3 scripts/generate_icons.py
"""

from __future__ import annotations

import io
import json
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SVG_PATH = ROOT / 'assets/icon/icon.svg'
IOS_ICONSET = ROOT / 'ios/CheckLister/Images.xcassets/AppIcon.appiconset'
ANDROID_RES = ROOT / 'android/app/src/main/res'

ANDROID_DENSITIES = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
# Fraction of the canvas the round icon's artwork is scaled to.
ROUND_ART_SCALE = 0.86
# Rounded-square corner radius as a fraction of the icon size.
SQUARE_CORNER_RATIO = 0.18
# Rendered at this multiple of the target size, then downsampled, for smoother masks.
SUPERSAMPLE = 4


def render(svg: str, size: int) -> Image.Image:
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=size, output_height=size)
    return Image.open(io.BytesIO(png)).convert('RGBA')


def scaled_art(svg: str, scale: float) -> str:
    """Shrinks the foreground group around the canvas center, keeping the background full-bleed."""
    offset = 512 * (1 - scale)
    return svg.replace(
        '<g fill="none"',
        f'<g transform="translate({offset:g},{offset:g}) scale({scale:g})" fill="none"',
        1,
    )


def masked(image: Image.Image, draw_shape) -> Image.Image:
    mask = Image.new('L', image.size, 0)
    draw_shape(ImageDraw.Draw(mask), image.size[0])
    image.putalpha(mask)
    return image


def write_ios(svg: str) -> None:
    contents = json.loads((IOS_ICONSET / 'Contents.json').read_text())
    for entry in contents['images']:
        points = float(entry['size'].split('x')[0])
        scale = int(entry['scale'].rstrip('x'))
        pixels = round(points * scale)
        filename = f'icon-{pixels}.png'
        render(svg, pixels).convert('RGB').save(IOS_ICONSET / filename)
        entry['filename'] = filename
    (IOS_ICONSET / 'Contents.json').write_text(json.dumps(contents, indent=2) + '\n')


def write_android(svg: str) -> None:
    round_svg = scaled_art(svg, ROUND_ART_SCALE)
    for density, size in ANDROID_DENSITIES.items():
        big = size * SUPERSAMPLE
        square = masked(
            render(svg, big),
            lambda d, s: d.rounded_rectangle((0, 0, s - 1, s - 1), radius=s * SQUARE_CORNER_RATIO, fill=255),
        )
        circle = masked(render(round_svg, big), lambda d, s: d.ellipse((0, 0, s - 1, s - 1), fill=255))
        out_dir = ANDROID_RES / f'mipmap-{density}'
        square.resize((size, size), Image.LANCZOS).save(out_dir / 'ic_launcher.png')
        circle.resize((size, size), Image.LANCZOS).save(out_dir / 'ic_launcher_round.png')


def main() -> None:
    svg = SVG_PATH.read_text()
    write_ios(svg)
    write_android(svg)


if __name__ == '__main__':
    main()
