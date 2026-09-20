import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChecklistsProvider } from '../useChecklists';
import { AsyncStorageChecklistRepository } from '../data/asyncStorageChecklistRepository';
import {
  ExternalSelectionProvider,
  useExternalSelection,
} from '../useExternalSelection';
import { ChecklistSelectScreen } from './ChecklistSelectScreen';
import { analytics } from '../../../shared/analytics/AnalyticsService';
import * as delivery from '../externalSelectCallbackDelivery';

jest.mock('../../../shared/analytics/AnalyticsService', () => ({
  analytics: { logEvent: jest.fn(), logScreenView: jest.fn() },
}));

// beforeRemove listeners only fire on a real navigator, not a mocked
// `navigation` prop — mirrors the harness RunScreen.test.tsx uses for
// usePreventRemove.
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

async function renderSelectScreen(callbackUrl = 'caller-app://select-result') {
  const navigationRef = createNavigationContainerRef<TestParamList>();
  const repository = new AsyncStorageChecklistRepository();

  const utils = await render(
    <ChecklistsProvider repository={repository}>
      <ExternalSelectionProvider>
        <BeginSelection callbackUrl={callbackUrl} />
        <NavigationContainer
          ref={navigationRef}
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
              options={{ title: 'Select checklist' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ExternalSelectionProvider>
    </ChecklistsProvider>,
  );

  return { navigationRef, repository, ...utils };
}

describe('ChecklistSelectScreen', () => {
  let deliverSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    deliverSpy = jest
      .spyOn(delivery, 'deliverExternalSelectResult')
      .mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('renders every checklist with its item count and no edit affordances', async () => {
    const repository = new AsyncStorageChecklistRepository();
    await repository.saveAll([
      { id: '1', title: 'Groceries', items: [{ id: 'a', text: 'Milk' }] },
      { id: '2', title: 'Chores', items: [] },
    ]);

    await renderSelectScreen();

    await waitFor(() => expect(screen.getByText('Groceries')).toBeTruthy());
    expect(screen.getByText('1 item')).toBeTruthy();
    expect(screen.getByText('Chores')).toBeTruthy();
    expect(screen.queryByLabelText('Rename')).toBeNull();
    expect(screen.queryByLabelText('Delete')).toBeNull();
  });

  it('logs screen_checklist_select with the checklist count on mount', async () => {
    const repository = new AsyncStorageChecklistRepository();
    await repository.saveAll([
      { id: '1', title: 'Groceries', items: [] },
      { id: '2', title: 'Chores', items: [] },
    ]);

    await renderSelectScreen();

    await waitFor(() =>
      expect(analytics.logScreenView).toHaveBeenCalledWith(
        'screen_checklist_select',
        { checklist_count: 2 },
      ),
    );
  });

  it('delivers a selected result and navigates back when a row is tapped', async () => {
    const repository = new AsyncStorageChecklistRepository();
    await repository.saveAll([{ id: '1', title: 'Groceries', items: [] }]);

    const { navigationRef } = await renderSelectScreen(
      'caller-app://select-result',
    );
    await waitFor(() => screen.getByText('Groceries'));

    await fireEvent.press(screen.getByText('Groceries'));

    await waitFor(() =>
      expect(deliverSpy).toHaveBeenCalledWith('caller-app://select-result', {
        status: 'selected',
        checklistId: '1',
        checklistName: 'Groceries',
      }),
    );
    await waitFor(() =>
      expect(navigationRef.getCurrentRoute()?.name).toBe('Placeholder'),
    );
  });

  it('delivers a cancelled result exactly once when the Cancel button is pressed', async () => {
    const repository = new AsyncStorageChecklistRepository();
    await repository.saveAll([{ id: '1', title: 'Groceries', items: [] }]);

    await renderSelectScreen('caller-app://select-result');
    await waitFor(() => screen.getByText('Groceries'));

    await fireEvent.press(screen.getByLabelText('Cancel'));

    await waitFor(() =>
      expect(deliverSpy).toHaveBeenCalledWith('caller-app://select-result', {
        status: 'cancelled',
      }),
    );
    expect(deliverSpy).toHaveBeenCalledTimes(1);
  });

  it('delivers only the selected result, not a duplicate cancelled result, when a row is tapped', async () => {
    const repository = new AsyncStorageChecklistRepository();
    await repository.saveAll([{ id: '1', title: 'Groceries', items: [] }]);

    await renderSelectScreen('caller-app://select-result');
    await waitFor(() => screen.getByText('Groceries'));

    await fireEvent.press(screen.getByText('Groceries'));

    await waitFor(() => expect(deliverSpy).toHaveBeenCalledTimes(1));
    expect(deliverSpy).toHaveBeenCalledWith(
      'caller-app://select-result',
      expect.objectContaining({ status: 'selected' }),
    );
  });
});
