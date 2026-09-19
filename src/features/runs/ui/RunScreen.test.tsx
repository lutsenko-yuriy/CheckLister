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
import { AsyncStorageRunRepository } from '../data/asyncStorageRunRepository';
import { RunRepository } from '../domain/runRepository';

// usePreventRemove (used by RunScreen to safely gate the swipe-back gesture,
// not just JS-dispatched actions — see RunScreen.tsx) calls useNavigation()
// and useRoute() internally, so it needs a real navigator in the tree rather
// than a mocked `navigation` prop. A Placeholder screen sits behind "Run" so
// goBack() has somewhere to go.
type TestParamList = { Placeholder: undefined; Run: { checklistId: string } };
const Stack = createNativeStackNavigator<TestParamList>();
const runRepository = new AsyncStorageRunRepository();

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

async function renderRun(
  itemTexts: string[],
  extra: React.ReactNode = null,
  repository: RunRepository = runRepository,
) {
  const checklist = {
    ...createChecklist('Groceries'),
    items: itemTexts.map(createItem),
  };
  const navigationRef = createNavigationContainerRef<TestParamList>();

  const utils = await render(
    <RunsProvider repository={repository}>
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
    <RunsProvider repository={runRepository}>
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
  afterEach(async () => {
    jest.restoreAllMocks();
    await AsyncStorage.clear();
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
    expect(await runRepository.getAll()).toEqual([
      expect.objectContaining({
        checklistTitle: 'Groceries',
        itemCount: 1,
      }),
    ]);
  });

  it('keeps the run open and reports an error when history cannot be saved', async () => {
    const failingRepository: RunRepository = {
      getAll: jest.fn().mockResolvedValue([]),
      saveAll: jest.fn().mockRejectedValue(new Error('storage failed')),
    };
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { navigationRef } = await renderRun(['A'], null, failingRepository);
    await waitFor(() => screen.getByText('A'));

    await fireEvent.press(screen.getByText('A'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Complete the checklist'));
    });

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Could not complete run',
        expect.stringContaining('not been saved'),
      ),
    );
    expect(navigationRef.current?.getCurrentRoute()?.name).toBe('Run');
    expect(screen.getByText('1 of 1 checked')).toBeTruthy();
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

  // CheL-36: Externally started checklist runs — Scenario-WU stubs below.

  it('completes an external run and returns its persisted result', () => {
    // TODO: Start an external run with a valid callback URL.
    // TODO: Verify its warning appears directly above the completion button.
    // TODO: Check every item and press Complete the checklist.
    // TODO: Verify the completed history entry is persisted before callback delivery.
    // TODO: Verify the callback receives status=completed, checklistId, and the persisted runId.
    // TODO: Verify the active run is cleared.
  });

  it('preserves an external run when exit is cancelled and returns cancellation when discarded', () => {
    // TODO: Start an external run and check one item.
    // TODO: Attempt to leave and choose Cancel.
    // TODO: Verify progress remains and no callback URL is opened.
    // TODO: Attempt to leave again and choose Discard.
    // TODO: Verify the callback receives status=cancelled and checklistId without runId.
    // TODO: Verify the active run is cleared.
  });

  it('keeps the external run outcome committed when callback delivery fails', () => {
    // TODO: Start and complete an external run while callback opening rejects.
    // TODO: Verify the run remains saved in history and is no longer active.
    // TODO: Verify the callback-failure dialog is shown.
    // TODO: Dismiss the dialog and verify CheckLister remains usable.
  });

  it('keeps normal runs free of external warnings and callbacks', () => {
    // TODO: Start a run from a checklist screen.
    // TODO: Verify the external-run warning is absent.
    // TODO: Complete or discard the run.
    // TODO: Verify no callback URL is opened.
  });
});
