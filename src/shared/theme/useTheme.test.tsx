import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from './useTheme';
import { darkPalette, lightPalette } from './palette';

function wrapper(scheme?: 'light' | 'dark') {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <ThemeProvider scheme={scheme}>{children}</ThemeProvider>;
  };
}

describe('useTheme', () => {
  it('resolves to the light palette when scheme is forced to light', async () => {
    const { result } = await renderHook(() => useTheme(), {
      wrapper: wrapper('light'),
    });

    expect(result.current.scheme).toBe('light');
    expect(result.current.colors).toBe(lightPalette);
  });

  it('resolves to the dark palette when scheme is forced to dark', async () => {
    const { result } = await renderHook(() => useTheme(), {
      wrapper: wrapper('dark'),
    });

    expect(result.current.scheme).toBe('dark');
    expect(result.current.colors).toBe(darkPalette);
  });

  it('returns the same palette object identity across re-renders', async () => {
    const { result, rerender } = await renderHook(() => useTheme(), {
      wrapper: wrapper('dark'),
    });
    const first = result.current.colors;

    await rerender({ children: null });

    expect(result.current.colors).toBe(first);
  });

  it('falls back to the light palette when no ThemeProvider is mounted', async () => {
    const { result } = await renderHook(() => useTheme());

    expect(result.current.scheme).toBe('light');
    expect(result.current.colors).toBe(lightPalette);
  });
});
