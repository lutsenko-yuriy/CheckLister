import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { SettingsScreen } from './SettingsScreen';
import { AnalyticsConsentProvider } from '../../../shared/analytics/useAnalyticsConsent';
import type { AnalyticsConsentStore } from '../../../shared/analytics/analyticsConsentStore';
import type { AnalyticsConsentStatus } from '../../../shared/analytics/ConsentGatedAnalyticsService';
import { analytics } from '../../../shared/analytics/AnalyticsService';
import { ThemeProvider } from '../../../shared/theme/useTheme';
import { darkPalette } from '../../../shared/theme/palette';

function setup(stored: AnalyticsConsentStatus) {
  const store: AnalyticsConsentStore = {
    load: jest.fn(async () => stored),
    save: jest.fn(async () => {}),
  };
  const gate = { setConsent: jest.fn(), logEvent: jest.fn() };
  return { store, gate };
}

async function renderSettings(
  stored: AnalyticsConsentStatus,
  scheme?: 'light' | 'dark',
) {
  const s = setup(stored);
  await render(
    <ThemeProvider scheme={scheme}>
      <AnalyticsConsentProvider store={s.store} gate={s.gate}>
        <SettingsScreen />
      </AnalyticsConsentProvider>
    </ThemeProvider>,
  );
  return s;
}

describe('SettingsScreen', () => {
  afterEach(() => jest.restoreAllMocks());

  it('shows the analytics row with its switch', async () => {
    await renderSettings('denied');

    expect(screen.getByText('Share anonymous usage data')).toBeTruthy();
    expect(screen.getByTestId('analytics-consent-switch')).toBeTruthy();
  });

  it.each([
    ['granted', true],
    ['denied', false],
    ['unknown', false],
  ] as const)(
    'shows the switch for a stored %s choice as %s',
    async (stored, on) => {
      await renderSettings(stored);

      expect(screen.getByTestId('analytics-consent-switch').props.value).toBe(
        on,
      );
    },
  );

  it('switching on grants consent immediately and saves it', async () => {
    const s = await renderSettings('denied');

    await fireEvent(
      screen.getByTestId('analytics-consent-switch'),
      'valueChange',
      true,
    );

    expect(screen.getByTestId('analytics-consent-switch').props.value).toBe(
      true,
    );
    expect(s.gate.setConsent).toHaveBeenLastCalledWith('granted');
    await waitFor(() => expect(s.store.save).toHaveBeenCalledWith('granted'));
    expect(s.gate.logEvent).toHaveBeenCalledWith('analytics_consent_granted');
  });

  it('switching off denies consent immediately and saves it', async () => {
    const s = await renderSettings('granted');

    await fireEvent(
      screen.getByTestId('analytics-consent-switch'),
      'valueChange',
      false,
    );

    expect(screen.getByTestId('analytics-consent-switch').props.value).toBe(
      false,
    );
    expect(s.gate.setConsent).toHaveBeenLastCalledWith('denied');
    await waitFor(() => expect(s.store.save).toHaveBeenCalledWith('denied'));
  });

  it('logs the settings screen view once, with no properties', async () => {
    const logScreenView = jest.spyOn(analytics, 'logScreenView');

    await renderSettings('denied');
    await fireEvent(
      screen.getByTestId('analytics-consent-switch'),
      'valueChange',
      true,
    );

    expect(logScreenView).toHaveBeenCalledTimes(1);
    expect(logScreenView).toHaveBeenCalledWith('screen_settings');
  });

  it('renders with the dark palette when in dark mode', async () => {
    await renderSettings('denied', 'dark');

    expect(screen.getByTestId('settings-screen')).toHaveStyle({
      backgroundColor: darkPalette.background,
    });
  });
});
