import { ImageStyle, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { useTheme } from './useTheme';
import type { Palette } from './palette';

// Mirrors RN's own StyleSheet.NamedStyles<T>, which the currently-generated
// react-native type definitions don't export.
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

// Keyed on palette object identity, not scheme string — `lightPalette` and
// `darkPalette` are stable module-level constants, so this cache holds
// across every component instance and re-render, and the factory below runs
// at most twice per screen for the app's lifetime (once per palette).
export function createThemedStyles<T extends NamedStyles<T>>(
  factory: (colors: Palette) => T,
): () => T {
  const cache = new WeakMap<Palette, T>();

  return function useStyles(): T {
    const { colors } = useTheme();
    const cached = cache.get(colors);
    if (cached) {
      return cached;
    }
    const created = StyleSheet.create(factory(colors));
    cache.set(colors, created);
    return created;
  };
}
