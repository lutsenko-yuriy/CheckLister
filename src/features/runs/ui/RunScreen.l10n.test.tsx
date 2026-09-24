import React, { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCountry, getLocales } from 'react-native-localize';
import { RunsProvider, useRuns } from '../useRuns';
import { RunScreen } from './RunScreen';
import { createChecklist, createItem } from '../../checklists/domain/models';
import { AsyncStorageRunRepository } from '../data/asyncStorageRunRepository';
import { ThemeProvider } from '../../../shared/theme/useTheme';
import { I18nProvider } from '../../../shared/i18n/useI18n';

type TestParamList = { Placeholder: undefined; Run: { checklistId: string } };
const Stack = createNativeStackNavigator<TestParamList>();
const runRepository = new AsyncStorageRunRepository();

function PlaceholderScreen() {
  return null;
}

function RunHarness({
  checklist,
  ...props
}: {
  checklist: ReturnType<typeof createChecklist>;
} & Record<string, unknown>) {
  const { startRun } = useRuns();
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      startRun(checklist);
    }
  }, [checklist, startRun]);

  return <RunScreen {...(props as any)} />;
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

async function renderRun(itemTexts: string[]) {
  const checklist = {
    ...createChecklist('Groceries'),
    items: itemTexts.map(createItem),
  };
  const navigationRef = createNavigationContainerRef<TestParamList>();

  const utils = await render(
    <I18nProvider>
      <ThemeProvider>
        <RunsProvider repository={runRepository}>
          <NavigationContainer
            ref={navigationRef}
            initialState={{
              index: 1,
              routes: [
                { name: 'Placeholder' },
                { name: 'Run', params: { checklistId: checklist.id } },
              ],
            }}
          >
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Placeholder" component={PlaceholderScreen} />
              <Stack.Screen name="Run">
                {props => <RunHarness checklist={checklist} {...props} />}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </RunsProvider>
      </ThemeProvider>
    </I18nProvider>,
  );

  return { checklist, navigationRef, ...utils };
}

describe('RunScreen localization (#80)', () => {
  beforeEach(() => {
    mockOS('en-US');
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    await AsyncStorage.clear();
  });

  it('renders the complete button and discard confirmation in Russian', async () => {
    mockOS('ru-RU');
    const { navigationRef } = await renderRun(['A', 'B']);

    await waitFor(() => screen.getByText('A'));
    expect(screen.getByText('Завершить чек-лист')).toBeTruthy();
    expect(screen.getByLabelText('Завершить чек-лист')).toBeTruthy();

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await act(async () => {
      navigationRef.current?.goBack();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Вы уверены?',
      'Если вы уйдёте сейчас, это выполнение будет отменено. Прогресс не сохранится.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Отмена' }),
        expect.objectContaining({ text: 'Отменить' }),
      ]),
    );
  });
});
