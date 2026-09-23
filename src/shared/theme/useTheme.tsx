import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette, type Palette } from './palette';
import { useColorSchemeAnalytics } from './useColorSchemeAnalytics';

export type ColorScheme = 'light' | 'dark';

interface ThemeContextValue {
  scheme: ColorScheme;
  colors: Palette;
}

const ThemeContext = createContext<ThemeContextValue>({
  scheme: 'light',
  colors: lightPalette,
});

function resolveScheme(osScheme: string | null | undefined): ColorScheme {
  return osScheme === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({
  scheme,
  children,
}: {
  // Test-only override; production never passes this and always follows the
  // OS setting via useColorScheme().
  scheme?: ColorScheme;
  children: React.ReactNode;
}) {
  const osScheme = useColorScheme();
  const resolvedScheme = scheme ?? resolveScheme(osScheme);
  useColorSchemeAnalytics(resolvedScheme);

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme: resolvedScheme,
      colors: resolvedScheme === 'dark' ? darkPalette : lightPalette,
    }),
    [resolvedScheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
