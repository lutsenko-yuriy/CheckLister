import React, { useEffect, useRef } from 'react';
import {
  render,
  fireEvent,
  waitFor,
  screen,
  act,
} from '@testing-library/react-native';
import { Alert } from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RunsProvider, useRuns } from '../useRuns';
import { RunScreen } from './RunScreen';
import { analytics } from '../../../shared/analytics/AnalyticsService';
import { createChecklist, createItem } from '../../checklists/domain/models';
import { AsyncStorageChecklistRepository } from '../../checklists/data/asyncStorageChecklistRepository';

// usePreventRemove (used by RunScreen to safely gate the swipe-back gesture,
// not just JS-dispatched actions — see RunScreen.tsx) calls useNavigation()
// and useRoute() internally, so it needs a real navigator in the tree rather
// than a mocked `navigation` prop. A Placeholder screen sits behind "Run" so
// goBack() has somewhere to go.
type TestParamList = { Placeholder: undefined; Run: { checklistId: string } };
const Stack = createNativeStackNavigator<TestParamList>();

function PlaceholderScreen() {
  return null;
}

function RunHarness({
  checklist,
  ...props
}: { checklist: ReturnType<typeof createChecklist> } & Record<
  string,
  unknown
>) {
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

async function renderRun(itemTexts: string[], extra: React.ReactNode = null) {
  const checklist = {
    ...createChecklist('Groceries'),
    items: itemTexts.map(createItem),
  };
  const navigationRef = createNavigationContainerRef<TestParamList>();

  const utils = await render(
    <RunsProvider>
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
      {extra}
    </RunsProvider>,
  );

  return { checklist, navigationRef, ...utils };
}

async function renderRunWithoutStarting() {
  const navigationRef = createNavigationContainerRef<TestParamList>();

  const utils = await render(
    <RunsProvider>
      <NavigationContainer
        ref={navigationRef}
        initialState={{
          index: 1,
          routes: [
            { name: 'Placeholder' },
            { name: 'Run', params: { checklistId: '1' } },
          ],
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Placeholder" component={PlaceholderScreen} />
          <Stack.Screen name="Run" component={RunScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </RunsProvider>,
  );

  return { navigationRef, ...utils };
}

describe('RunScreen', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders all items unchecked when a run starts', async () => {
    await renderRun(['A', 'B', 'C']);

    for (const text of ['A', 'B', 'C']) {
      await waitFor(() => screen.getByText(text));
      const row = screen.getByText(text).parent?.parent;
      expect(row?.props.accessibilityState).toEqual(
        expect.objectContaining({ checked: false }),
      );
    }
  });

  it('tapping an item toggles its checked state', async () => {
    await renderRun(['A', 'B']);
    await waitFor(() => screen.getByText('A'));

    const rowFor = (text: string) => screen.getByText(text).parent?.parent;

    await fireEvent.press(rowFor('A')!);
    expect(rowFor('A')?.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
    expect(rowFor('B')?.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: false }),
    );

    await fireEvent.press(rowFor('A')!);
    expect(rowFor('A')?.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: false }),
    );
  });

  it('"Complete the checklist" is disabled until every item is checked, then enabled', async () => {
    await renderRun(['A', 'B']);
    await waitFor(() => screen.getByText('A'));

    const completeButton = () =>
      screen.getByLabelText('Complete the checklist');
    expect(completeButton().props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );

    await fireEvent.press(screen.getByText('A'));
    await fireEvent.press(screen.getByText('B'));

    expect(completeButton().props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false }),
    );
  });

  it('completing the run pops the screen and clears the active run', async () => {
    let capturedActiveRun: unknown;

    function Observer() {
      const { activeRun } = useRuns();
      capturedActiveRun = activeRun;
      return null;
    }

    const { navigationRef } = await renderRun(['A'], <Observer />);
    await waitFor(() => screen.getByText('A'));

    await fireEvent.press(screen.getByText('A'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Complete the checklist'));
    });

    await waitFor(() =>
      expect(navigationRef.current?.getCurrentRoute()?.name).toBe(
        'Placeholder',
      ),
    );
    expect(capturedActiveRun).toBeNull();
  });

  it('exiting before completion prompts confirmation; confirming discards the run, cancelling preserves it', async () => {
    let capturedActiveRun: unknown;

    function Observer() {
      const { activeRun } = useRuns();
      capturedActiveRun = activeRun;
      return null;
    }

    const { navigationRef } = await renderRun(['A', 'B'], <Observer />);
    await waitFor(() => screen.getByText('A'));
    await fireEvent.press(screen.getByText('A'));

    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _msg, buttons) => {
        buttons?.find(b => b.text === 'Cancel')?.onPress?.();
      });
    await act(async () => {
      navigationRef.current?.goBack();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Are you sure?',
      expect.any(String),
      expect.any(Array),
    );
    // Cancelled: progress preserved, still on the Run screen.
    expect(navigationRef.current?.getCurrentRoute()?.name).toBe('Run');
    const rowA = screen.getByText('A').parent?.parent;
    expect(rowA?.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
    expect(capturedActiveRun).not.toBeNull();

    alertSpy.mockImplementation((_title, _msg, buttons) => {
      buttons?.find(b => b.text === 'Discard')?.onPress?.();
    });
    await act(async () => {
      navigationRef.current?.goBack();
    });

    await waitFor(() =>
      expect(navigationRef.current?.getCurrentRoute()?.name).toBe(
        'Placeholder',
      ),
    );
    expect(capturedActiveRun).toBeNull();
  });

  it('logs run analytics with the documented properties', async () => {
    const logEventSpy = jest.spyOn(analytics, 'logEvent');
    const logScreenViewSpy = jest.spyOn(analytics, 'logScreenView');

    const checklist = {
      ...createChecklist('Groceries'),
      id: '1',
      items: [createItem('A'), createItem('B')],
    };
    const navigationRef = createNavigationContainerRef<TestParamList>();
    await render(
      <RunsProvider>
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
      </RunsProvider>,
    );
    await waitFor(() => screen.getByText('A'));

    expect(logScreenViewSpy).toHaveBeenCalledWith('screen_checklist_run', {
      checklist_id: '1',
      item_count: 2,
    });

    await fireEvent.press(screen.getByText('A'));
    expect(logEventSpy).toHaveBeenCalledWith('run_item_toggled', {
      checklist_id: '1',
      checked: true,
      checked_count: 1,
      item_count: 2,
    });

    await fireEvent.press(screen.getByText('B'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Complete the checklist'));
    });

    expect(logEventSpy).toHaveBeenCalledWith('run_completed', {
      checklist_id: '1',
      item_count: 2,
    });
  });

  it("completing a run does not affect the source checklist's items", async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
        ],
      },
    ]);

    const checklist = (await repo.getAll())[0];
    const navigationRef = createNavigationContainerRef<TestParamList>();
    await render(
      <RunsProvider>
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
      </RunsProvider>,
    );
    await waitFor(() => screen.getByText('A'));

    await fireEvent.press(screen.getByText('A'));
    await fireEvent.press(screen.getByText('B'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Complete the checklist'));
    });

    const stored = (await repo.getAll())[0];
    expect(stored.items).toEqual([
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ]);

    await AsyncStorage.clear();
  });

  it('shows a defensive empty state if the screen mounts with no active run', async () => {
    const { navigationRef } = await renderRunWithoutStarting();

    await waitFor(() =>
      expect(screen.getByText(/no active run/i)).toBeTruthy(),
    );

    await fireEvent.press(screen.getByLabelText('Back'));
    await waitFor(() =>
      expect(navigationRef.current?.getCurrentRoute()?.name).toBe(
        'Placeholder',
      ),
    );
  });
});
