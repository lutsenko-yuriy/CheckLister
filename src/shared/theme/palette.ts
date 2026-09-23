// Both palettes share the same token set (background, text, primary, ...) so
// every screen can read `colors.<token>` without branching on scheme; only
// the values differ. See `useTheme.tsx` for how the active one is resolved.
export interface Palette {
  background: string;
  headerBackground: string;
  surface: string;
  primary: string;
  // Distinct from `primary`: reserved for text (links, "Back" affordances) so
  // it meets WCAG AA's 4.5:1 minimum against `background`, unlike `primary`
  // itself which only has to clear the 3:1 non-text-UI threshold.
  linkText: string;
  border: string;
  text: string;
  textMuted: string;
  danger: string;
  onPrimary: string;
}

export const lightPalette: Palette = {
  background: '#EAF2FB',
  headerBackground: '#EAF2FB',
  surface: '#EAF2FB',
  primary: '#2F6FEE',
  linkText: '#2A63D6',
  border: '#C9DEF5',
  text: '#1B2733',
  textMuted: '#55698A',
  danger: '#D64545',
  onPrimary: '#FFFFFF',
};

export const darkPalette: Palette = {
  background: '#0E1724',
  headerBackground: '#0E1724',
  // One step lighter than `background` (unlike light mode, where the two are
  // identical) so cards/rows get elevation separation without relying on
  // `border` alone.
  surface: '#152233',
  primary: '#5B9BFF',
  // Lighter than `primary` here — the opposite direction from `lightPalette`
  // — because the token's job (readable-as-text variant of the brand blue)
  // stays the same while the background it must contrast against flips.
  linkText: '#8FBCFF',
  border: '#26384F',
  text: '#E6F0FB',
  textMuted: '#9FB4CE',
  danger: '#FF6B6B',
  onPrimary: '#0B1220',
};
