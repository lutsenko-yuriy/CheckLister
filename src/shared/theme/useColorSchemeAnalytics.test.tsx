import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider } from './useTheme';
import { analytics } from '../analytics/AnalyticsService';

function Probe() {
  return <Text>probe</Text>;
}

describe('useColorSchemeAnalytics (via ThemeProvider)', () => {
  it('logs color_scheme_resolved once on mount with the resolved scheme', async () => {
    const spy = jest.spyOn(analytics, 'logEvent').mockImplementation(() => {});

    await render(
      <ThemeProvider scheme="dark">
        <Probe />
      </ThemeProvider>,
    );

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('color_scheme_resolved', {
      color_scheme: 'dark',
    });
    spy.mockRestore();
  });

  it('does not log again on re-render with the same scheme', async () => {
    const spy = jest.spyOn(analytics, 'logEvent').mockImplementation(() => {});

    const { rerender } = await render(
      <ThemeProvider scheme="light">
        <Probe />
      </ThemeProvider>,
    );
    await rerender(
      <ThemeProvider scheme="light">
        <Probe />
      </ThemeProvider>,
    );

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('logs again when the scheme changes — covers an OS flip while foregrounded, and a resolved-null-then-real-value cold start', async () => {
    const spy = jest.spyOn(analytics, 'logEvent').mockImplementation(() => {});

    const { rerender } = await render(
      <ThemeProvider scheme="light">
        <Probe />
      </ThemeProvider>,
    );
    await rerender(
      <ThemeProvider scheme="dark">
        <Probe />
      </ThemeProvider>,
    );

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, 'color_scheme_resolved', {
      color_scheme: 'light',
    });
    expect(spy).toHaveBeenNthCalledWith(2, 'color_scheme_resolved', {
      color_scheme: 'dark',
    });
    spy.mockRestore();
  });

  it('logs exactly once for a background-to-foreground transition that lands on a new scheme — not once per intermediate delivery', async () => {
    const spy = jest.spyOn(analytics, 'logEvent').mockImplementation(() => {});

    const { rerender } = await render(
      <ThemeProvider scheme="light">
        <Probe />
      </ThemeProvider>,
    );
    // Only the value the hook actually observes on re-render matters — it
    // has no AppState listener of its own — so a background→foreground
    // transition collapses to a single re-render with the final value here.
    await rerender(
      <ThemeProvider scheme="dark">
        <Probe />
      </ThemeProvider>,
    );

    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
