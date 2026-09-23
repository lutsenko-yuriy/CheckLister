import { darkPalette, lightPalette, type Palette } from './palette';

// WCAG 2.x relative-luminance / contrast-ratio formulas
// (https://www.w3.org/TR/WCAG21/#contrast-minimum), kept local to this test
// rather than shipped as production code since nothing else needs it.
function channelLuminance(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

describe.each<[string, Palette]>([
  ['light', lightPalette],
  ['dark', darkPalette],
])('%s palette WCAG contrast', (_name, palette) => {
  it('text meets the 4.5:1 minimum against background and surface', () => {
    expect(
      contrastRatio(palette.text, palette.background),
    ).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.text, palette.surface)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it('textMuted meets the 4.5:1 minimum against background and surface', () => {
    expect(
      contrastRatio(palette.textMuted, palette.background),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(palette.textMuted, palette.surface),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('linkText meets the 4.5:1 minimum against background and surface', () => {
    expect(
      contrastRatio(palette.linkText, palette.background),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(palette.linkText, palette.surface),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('onPrimary meets the 4.5:1 minimum against primary', () => {
    expect(
      contrastRatio(palette.onPrimary, palette.primary),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('primary meets the 3:1 minimum (non-text UI component) against background', () => {
    expect(
      contrastRatio(palette.primary, palette.background),
    ).toBeGreaterThanOrEqual(3);
  });

  it('danger meets the 3:1 minimum (non-text UI component) against background', () => {
    expect(
      contrastRatio(palette.danger, palette.background),
    ).toBeGreaterThanOrEqual(3);
  });
});
