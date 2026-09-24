import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { getCountry, getLocales } from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageRunRepository } from '../data/asyncStorageRunRepository';
import { RunHistoryEntry } from '../domain/models';
import { RunsProvider } from '../useRuns';
import { RunHistoryScreen } from './RunHistoryScreen';
import { ThemeProvider } from '../../../shared/theme/useTheme';
import { I18nProvider } from '../../../shared/i18n/useI18n';
import { formatDateTime, translate } from '../../../shared/i18n/translate';

const packing: RunHistoryEntry = {
  id: 'packing-run',
  checklistId: 'packing',
  checklistTitle: 'Packing',
  itemCount: 8,
  // Midday UTC so the calendar date is the 18th in any UTC-11..UTC+11
  // test-machine time zone.
  completedAt: '2026-09-18T12:00:00.000Z',
};

function mockOS(languageTag: string, country: string) {
  const [languageCode, countryCode = ''] = languageTag.split('-');
  jest
    .mocked(getLocales)
    .mockReturnValue([
      { languageTag, languageCode, countryCode, isRTL: false },
    ]);
  jest.mocked(getCountry).mockReturnValue(country);
}

async function renderHistory(params: {
  checklistId?: string;
  checklistTitle?: string;
}) {
  const repository = new AsyncStorageRunRepository();
  await repository.saveAll([packing]);
  const navigation = { setOptions: jest.fn() };

  const utils = await render(
    <I18nProvider>
      <ThemeProvider>
        <RunsProvider repository={repository}>
          <RunHistoryScreen
            navigation={navigation as any}
            route={{ params } as any}
          />
        </RunsProvider>
      </ThemeProvider>
    </I18nProvider>,
  );
  return { navigation, ...utils };
}

async function renderEmptyHistory(params: {
  checklistId?: string;
  checklistTitle?: string;
}) {
  const repository = new AsyncStorageRunRepository();
  const navigation = { setOptions: jest.fn() };

  const utils = await render(
    <I18nProvider>
      <ThemeProvider>
        <RunsProvider repository={repository}>
          <RunHistoryScreen
            navigation={navigation as any}
            route={{ params } as any}
          />
        </RunsProvider>
      </ThemeProvider>
    </I18nProvider>,
  );
  return { navigation, ...utils };
}

describe('RunHistoryScreen localization (#80)', () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await AsyncStorage.clear();
  });

  it('formats history rows with German plurals and a German date', async () => {
    mockOS('de-DE', 'DE');
    await renderHistory({});

    await waitFor(() => expect(screen.getByText('Packing')).toBeTruthy());
    const expectedDate = formatDateTime('de', 'DE', packing.completedAt);
    expect(expectedDate).toContain('18.09.2026');
    expect(
      screen.getByText(
        translate('de', 'runHistory.row', { count: 8, date: expectedDate }),
      ),
    ).toBeTruthy();
  });

  it('localizes the per-checklist history title and the empty state', async () => {
    mockOS('fr-FR', 'FR');
    const { navigation } = await renderHistory({
      checklistId: 'packing',
      checklistTitle: 'Packing',
    });

    await waitFor(() => {
      const calls = navigation.setOptions.mock.calls;
      expect(calls[calls.length - 1][0].title).toBe('Historique : Packing');
    });

    await AsyncStorage.clear();
    const emptyResult = await renderEmptyHistory({
      checklistId: 'packing',
      checklistTitle: 'Packing',
    });

    await waitFor(() =>
      expect(
        emptyResult.getByText('Aucune session terminée pour le moment.'),
      ).toBeTruthy(),
    );
    expect(emptyResult.navigation.setOptions).toHaveBeenCalled();
  });
});
