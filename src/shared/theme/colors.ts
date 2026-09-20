// Single source of truth for the app's color palette (CheL-14). Every
// screen/component should read from here rather than hard-coding hex values,
// so the palette can be re-tuned in one place.
export const colors = {
  background: '#EAF2FB',
  headerBackground: '#EAF2FB',
  surface: '#EAF2FB',
  primary: '#2F6FEE',
  // Darker than `primary`: reserved for text (links, "Back" affordances) so it
  // meets WCAG AA's 4.5:1 minimum against `background`, unlike `primary`
  // itself (4.02:1) which stays as the button/icon color (3:1 threshold).
  linkText: '#2A63D6',
  border: '#C9DEF5',
  text: '#1B2733',
  textMuted: '#55698A',
  danger: '#D64545',
  onPrimary: '#FFFFFF',
};
