import React from 'react';
import { cleanup, render, screen } from '@testing-library/react-native';
import { getCountry, getLocales } from 'react-native-localize';
import { I18nProvider } from '@checklister/i18n';
import { SettingsScreen } from './SettingsScreen';
import { AnalyticsConsentProvider } from '../../../shared/analytics/useAnalyticsConsent';
import { ThemeProvider } from '../../../shared/theme/useTheme';

function mockOS(languageTag: string) {
  const [languageCode, countryCode = ''] = languageTag.split('-');
  jest
    .mocked(getLocales)
    .mockReturnValue([
      { languageTag, languageCode, countryCode, isRTL: false },
    ]);
  jest.mocked(getCountry).mockReturnValue(countryCode || 'US');
}

async function renderSettings() {
  return render(
    <I18nProvider>
      <ThemeProvider>
        <AnalyticsConsentProvider
          store={{ load: async () => 'denied', save: async () => {} }}
          gate={{ setConsent: jest.fn(), logEvent: jest.fn() }}
        >
          <SettingsScreen />
        </AnalyticsConsentProvider>
      </ThemeProvider>
    </I18nProvider>,
  );
}

describe('SettingsScreen localization (CheL-127)', () => {
  afterEach(() => cleanup());

  it.each([
    ['en-US', 'Share anonymous usage data'],
    ['de-DE', 'Anonyme Nutzungsdaten teilen'],
    ['fr-FR', "Partager des données d'utilisation anonymes"],
    ['ru-RU', 'Делиться анонимными данными об использовании'],
  ])('renders the analytics row in %s', async (tag, label) => {
    mockOS(tag);

    await renderSettings();

    expect(screen.getByText(label)).toBeTruthy();
  });
});
