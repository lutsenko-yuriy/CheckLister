import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { createThemedStyles } from './createThemedStyles';
import { ThemeProvider } from './useTheme';
import type { Palette } from './palette';

function wrapper(scheme: 'light' | 'dark') {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <ThemeProvider scheme={scheme}>{children}</ThemeProvider>;
  };
}

describe('createThemedStyles', () => {
  it('builds styles from the active palette', async () => {
    const factory = jest.fn((colors: Palette) => ({
      root: { backgroundColor: colors.background },
    }));
    const useStyles = createThemedStyles(factory);

    const { result } = await renderHook(() => useStyles(), {
      wrapper: wrapper('dark'),
    });

    expect(result.current.root.backgroundColor).toBe('#0E1724');
  });

  it('runs the factory at most once per palette, even across multiple hook instances', async () => {
    const factory = jest.fn((colors: Palette) => ({
      root: { backgroundColor: colors.background },
    }));
    const useStyles = createThemedStyles(factory);

    await renderHook(() => useStyles(), { wrapper: wrapper('dark') });
    await renderHook(() => useStyles(), { wrapper: wrapper('dark') });
    await renderHook(() => useStyles(), { wrapper: wrapper('dark') });

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('produces different styles when the palette switches, and reuses the cached object switching back', async () => {
    const factory = jest.fn((colors: Palette) => ({
      root: { backgroundColor: colors.background },
    }));
    const useStyles = createThemedStyles(factory);

    const light = await renderHook(() => useStyles(), {
      wrapper: wrapper('light'),
    });
    const dark = await renderHook(() => useStyles(), {
      wrapper: wrapper('dark'),
    });
    const lightAgain = await renderHook(() => useStyles(), {
      wrapper: wrapper('light'),
    });

    expect(light.result.current).not.toBe(dark.result.current);
    expect(lightAgain.result.current).toBe(light.result.current);
    expect(factory).toHaveBeenCalledTimes(2);
  });
});
