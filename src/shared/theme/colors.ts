// Single source of truth for the app's color palette (CheL-14). Every
// screen/component should read from here rather than hard-coding hex values,
// so the palette can be re-tuned in one place.
export const colors = {
  background: '#EAF2FB',
  headerBackground: '#EAF2FB',
  surface: '#EAF2FB',
  primary: '#2F6FEE',
  border: '#C9DEF5',
  text: '#1B2733',
  textMuted: '#5C7189',
  danger: '#D64545',
  onPrimary: '#FFFFFF',
};
