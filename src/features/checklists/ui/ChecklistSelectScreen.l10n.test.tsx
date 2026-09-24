import React from 'react';
import {
  render,
  screen,
  waitFor,
  cleanup,
} from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChecklistsProvider } from '../useChecklists';
import { AsyncStorageChecklistRepository } from '../data/asyncStorageChecklistRepository';
import {
  ExternalSelectionProvider,
  useExternalSelection,
} from '../useExternalSelection';
import { ChecklistSelectScreen } from './ChecklistSelectScreen';
import { I18nProvider, useI18n } from '../../../shared/i18n/useI18n';
import { getCountry, getLocales } from 'react-native-localize';

jest.mock('../../../shared/analytics/AnalyticsService', () => ({
  analytics: { logEvent: jest.fn(), logScreenView: jest.fn() },
}));

type TestParamList = { Placeholder: undefined; ChecklistSelect: undefined };
const Stack = createNativeStackNavigator<TestParamList>();

function PlaceholderScreen() {
  return null;
}

function BeginSelection({ callbackUrl }: { callbackUrl: string }) {
  const { beginSelection } = useExternalSelection();
  const started = React.useRef(false);
  React.useEffect(() => {
    if (!started.current) {
      started.current = true;
      beginSelection(callbackUrl);
    }
  }, [beginSelection, callbackUrl]);
  return null;
}

function LocalizedTitleNavigator() {
  const { t } = useI18n();
  return (
    <NavigationContainer
      initialState={{
        index: 1,
        routes: [{ name: 'Placeholder' }, { name: 'ChecklistSelect' }],
      }}
    >
      <Stack.Navigator>
        <Stack.Screen name="Placeholder" component={PlaceholderScreen} />
        <Stack.Screen
          name="ChecklistSelect"
          component={ChecklistSelectScreen as any}
          options={{ title: t('nav.selectChecklistTitle') }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function mockOS(languageTag: string) {
  const [languageCode, countryCode = ''] = languageTag.split('-');
  jest
    .mocked(getLocales)
    .mockReturnValue([
      { languageTag, languageCode, countryCode, isRTL: false },
    ]);
  jest.mocked(getCountry).mockReturnValue(countryCode || 'US');
}

async function renderSelectScreen(
  repository: AsyncStorageChecklistRepository,
  callbackUrl = 'caller-app://select-result',
) {
  const utils = render(
    <I18nProvider>
      <ChecklistsProvider repository={repository}>
        <ExternalSelectionProvider>
          <BeginSelection callbackUrl={callbackUrl} />
          <LocalizedTitleNavigator />
        </ExternalSelectionProvider>
      </ChecklistsProvider>
    </I18nProvider>,
  );
  return utils;
}

describe('ChecklistSelectScreen localization (#80)', () => {
  beforeEach(() => {
    mockOS('en-US');
  });

  afterEach(async () => {
    cleanup();
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('renders the picker in French with checklist names verbatim', async () => {
    mockOS('fr-FR');
    const repository = new AsyncStorageChecklistRepository();
    await repository.saveAll([
      { id: '1', title: 'Groceries', items: [{ id: 'a', text: 'Milk' }] },
      {
        id: '2',
        title: 'Chores',
        items: [
          { id: 'a', text: 'Dishes' },
          { id: 'b', text: 'Trash' },
        ],
      },
    ]);
    const utils = await renderSelectScreen(repository);

    await waitFor(() => expect(screen.getByText('Groceries')).toBeTruthy());
    expect(JSON.stringify(utils.toJSON())).toContain('Choisir une checklist');
    expect(screen.getByLabelText('Annuler')).toBeTruthy();
    expect(screen.getByText('Groceries')).toBeTruthy();
    expect(screen.getByText('Chores')).toBeTruthy();
    expect(screen.getByText('1 élément')).toBeTruthy();
    expect(screen.getByText('2 éléments')).toBeTruthy();
  });
});
