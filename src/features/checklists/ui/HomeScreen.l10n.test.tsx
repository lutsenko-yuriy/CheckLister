import React from 'react';
import { Alert } from 'react-native';
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from '@testing-library/react-native';
import { getCountry, getLocales } from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChecklistsProvider } from '../useChecklists';
import { AsyncStorageChecklistRepository } from '../data/asyncStorageChecklistRepository';
import { HomeScreen } from './HomeScreen';
import { RunsProvider } from '../../runs/useRuns';
import { AsyncStorageRunRepository } from '../../runs/data/asyncStorageRunRepository';
import { ThemeProvider } from '../../../shared/theme/useTheme';
import { I18nProvider } from '../../../shared/i18n/useI18n';

function mockOS(languageTag: string) {
  const [languageCode, countryCode = ''] = languageTag.split('-');
  jest
    .mocked(getLocales)
    .mockReturnValue([
      { languageTag, languageCode, countryCode, isRTL: false },
    ]);
  jest.mocked(getCountry).mockReturnValue(countryCode || 'US');
}

function mockOSList(languageTags: string[]) {
  jest.mocked(getLocales).mockReturnValue(
    languageTags.map(languageTag => {
      const [languageCode, countryCode = ''] = languageTag.split('-');
      return { languageTag, languageCode, countryCode, isRTL: false };
    }),
  );
  jest.mocked(getCountry).mockReturnValue('US');
}

function homeScreenTree(
  repository: AsyncStorageChecklistRepository = new AsyncStorageChecklistRepository(),
) {
  return (
    <I18nProvider>
      <ThemeProvider>
        <ChecklistsProvider repository={repository}>
          <RunsProvider repository={new AsyncStorageRunRepository()}>
            <HomeScreen
              navigation={{ navigate: jest.fn(), setOptions: jest.fn() } as any}
              route={{} as any}
            />
          </RunsProvider>
        </ChecklistsProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

async function renderHomeScreen(repository?: AsyncStorageChecklistRepository) {
  return render(homeScreenTree(repository));
}

describe('HomeScreen localization (#80)', () => {
  beforeEach(() => {
    mockOS('en-US');
  });

  afterEach(async () => {
    cleanup();
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('renders home screen text in German and keeps checklist titles verbatim', async () => {
    mockOS('de-DE');
    const repository = new AsyncStorageChecklistRepository();
    await repository.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: Array.from({ length: 7 }, (_, i) => ({
          id: `item-${i}`,
          text: `Item ${i}`,
        })),
      },
    ]);

    await renderHomeScreen(repository);

    await waitFor(() => expect(screen.getByText('Groceries')).toBeTruthy());
    expect(screen.getByPlaceholderText('Neue Checkliste')).toBeTruthy();
    expect(screen.getByLabelText('Hinzufügen')).toBeTruthy();
    expect(screen.getByText('Groceries')).toBeTruthy();
    expect(screen.getByText('7 Einträge')).toBeTruthy();
  });

  it('uses Russian one/few/many plural forms for item counts', async () => {
    mockOS('ru-RU');
    const repository = new AsyncStorageChecklistRepository();
    const counts = { one: 1, few: 2, many5: 5, many11: 11, one21: 21 };
    await repository.saveAll(
      Object.entries(counts).map(([key, count]) => ({
        id: key,
        title: key,
        items: Array.from({ length: count }, (_, i) => ({
          id: `${key}-${i}`,
          text: `item ${i}`,
        })),
      })),
    );

    await renderHomeScreen(repository);

    await waitFor(() => expect(screen.getByText('one')).toBeTruthy());
    expect(screen.getAllByText('1 пункт')).toHaveLength(1); // count 1
    expect(screen.getAllByText('21 пункт')).toHaveLength(1); // count 21
    expect(screen.getAllByText('2 пункта')).toHaveLength(1); // count 2 (few)
    expect(screen.getAllByText('5 пунктов')).toHaveLength(1); // count 5 (many)
    expect(screen.getAllByText('11 пунктов')).toHaveLength(1); // count 11 (many)
  });

  it('walks the preferred-language list and falls back to English', async () => {
    mockOSList(['ja-JP', 'fr-FR']);
    const first = await renderHomeScreen();

    await waitFor(() =>
      expect(first.getByPlaceholderText('Nouvelle checklist')).toBeTruthy(),
    );
    first.unmount();

    // I18nProvider only re-resolves on an AppState 'active' transition, not
    // an arbitrary re-render, so a fresh mount (like a real per-app language
    // change, which relaunches the JS context) is what exercises the second
    // preferred-locale list here.
    mockOSList(['ja-JP', 'pt-BR']);
    const second = await renderHomeScreen();

    await waitFor(() =>
      expect(second.getByPlaceholderText('New checklist title')).toBeTruthy(),
    );
  });

  it('localizes the delete confirmation and inserts the title verbatim', async () => {
    mockOS('fr-FR');
    const repository = new AsyncStorageChecklistRepository();
    await repository.saveAll([{ id: '1', title: 'Groceries', items: [] }]);
    let alertButtons: { text?: string; onPress?: () => void }[] | undefined;
    jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) => {
        alertButtons = buttons as typeof alertButtons;
      });

    await renderHomeScreen(repository);

    await waitFor(() => expect(screen.getByText('Groceries')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('Supprimer'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Supprimer la checklist ?',
      'Tous ses éléments seront supprimés. Cette action est irréversible.',
      expect.any(Array),
    );
    expect(alertButtons?.map(button => button.text)).toEqual([
      'Annuler',
      'Supprimer',
    ]);
  });
});
