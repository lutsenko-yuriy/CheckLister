import React, { useEffect, useRef } from 'react';
import {
  render,
  fireEvent,
  waitFor,
  screen,
  act,
} from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
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
  callbackUrl,
  ...props
}: {
  checklist: ReturnType<typeof createChecklist>;
  callbackUrl?: string;
} & Record<string, unknown>) {
  const { startRun, startExternalRun } = useRuns();
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      if (callbackUrl) {
        startExternalRun(checklist, callbackUrl);
      } else {
        startRun(checklist);
      }
    }
  }, [callbackUrl, checklist, startExternalRun, startRun]);

  return <RunScreen {...(props as any)} />;
}

async function renderRun(
  itemTexts: string[],
  extra: React.ReactNode = null,
  repository: RunRepository = runRepository,
  callbackUrl?: string,
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
            {props => (
              <RunHarness
                checklist={checklist}
                callbackUrl={callbackUrl}
                {...props}
              />
            )}
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
    jest.clearAllMocks();
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

  it('completes an external run and returns its persisted result', async () => {
    let capturedActiveRun: unknown;
    let navigationRef: ReturnType<
      typeof createNavigationContainerRef<TestParamList>
    >;
    jest.spyOn(analytics, 'logEvent');

    function Observer() {
      const { activeRun } = useRuns();
      capturedActiveRun = activeRun;
      return null;
    }

    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockImplementation(async value => {
        const history = await runRepository.getAll();
        expect(history).toHaveLength(1);
        expect(capturedActiveRun).toBeNull();
        expect(navigationRef.current?.getCurrentRoute()?.name).toBe(
          'Placeholder',
        );

        const callbackUrl = new URL(value);
        expect(callbackUrl.searchParams.get('status')).toBe('completed');
        expect(callbackUrl.searchParams.get('checklistId')).toBe(
          history[0].checklistId,
        );
        expect(callbackUrl.searchParams.get('runId')).toBe(history[0].id);
      });
    const rendered = await renderRun(
      ['A'],
      <Observer />,
      runRepository,
      'caller-app://result?source=widget',
    );
    navigationRef = rendered.navigationRef;
    await waitFor(() => screen.getByText('A'));

    const warning = screen.getByText(
      'Started by another app. Finishing or cancelling returns you to that app.',
    );
    const completeButton = screen.getByLabelText('Complete the checklist');
    expect(warning.parent).toBe(completeButton.parent);
    expect(warning.parent?.children.indexOf(warning)).toBeLessThan(
      completeButton.parent?.children.indexOf(completeButton) ?? -1,
    );

    await fireEvent.press(screen.getByText('A'));
    await act(async () => {
      fireEvent.press(completeButton);
    });

    await waitFor(() => expect(openUrlSpy).toHaveBeenCalledTimes(1));
    expect(analytics.logEvent).toHaveBeenCalledWith(
      'external_run_callback_finished',
      { status: 'completed', delivered: true },
    );
  });

  it('preserves an external run when exit is cancelled and returns cancellation when discarded', async () => {
    let capturedActiveRun: unknown;
    jest.spyOn(analytics, 'logEvent');

    function Observer() {
      const { activeRun } = useRuns();
      capturedActiveRun = activeRun;
      return null;
    }

    const openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) => {
        buttons?.find(button => button.text === 'Cancel')?.onPress?.();
      });
    const { checklist, navigationRef } = await renderRun(
      ['A', 'B'],
      <Observer />,
      runRepository,
      'caller-app://result?runId=stale',
    );
    await waitFor(() => screen.getByText('A'));
    await fireEvent.press(screen.getByText('A'));

    await act(async () => {
      navigationRef.current?.goBack();
    });

    expect(navigationRef.current?.getCurrentRoute()?.name).toBe('Run');
    expect(capturedActiveRun).not.toBeNull();
    expect(openUrlSpy).not.toHaveBeenCalled();

    alertSpy.mockImplementation((_title, _message, buttons) => {
      buttons?.find(button => button.text === 'Discard')?.onPress?.();
    });
    await act(async () => {
      navigationRef.current?.goBack();
    });

    await waitFor(() => expect(openUrlSpy).toHaveBeenCalledTimes(1));
    expect(capturedActiveRun).toBeNull();
    expect(navigationRef.current?.getCurrentRoute()?.name).toBe('Placeholder');
    const callbackUrl = new URL(openUrlSpy.mock.calls[0][0]);
    expect(callbackUrl.searchParams.get('status')).toBe('cancelled');
    expect(callbackUrl.searchParams.get('checklistId')).toBe(checklist.id);
    expect(callbackUrl.searchParams.has('runId')).toBe(false);
    expect(analytics.logEvent).toHaveBeenCalledWith(
      'external_run_callback_finished',
      { status: 'cancelled', delivered: true },
    );
  });

  it('ignores a stale discard confirmation after another external run replaces the active run', async () => {
    const replacementChecklist = {
      ...createChecklist('Hardware store'),
      items: [createItem('Screws')],
    };
    const observedRun: {
      current: ReturnType<typeof useRuns>['activeRun'];
    } = { current: null };
    let replaceRun: (() => void) | undefined;
    let confirmStaleDiscard: (() => void) | undefined;

    function Controller() {
      const { activeRun, startExternalRun } = useRuns();
      observedRun.current = activeRun;
      replaceRun = () =>
        startExternalRun(replacementChecklist, 'new-caller://result');
      return null;
    }

    const openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) => {
        const discardAction = buttons?.find(
          button => button.text === 'Discard',
        )?.onPress;
        confirmStaleDiscard = discardAction ? () => discardAction() : undefined;
      });
    const { navigationRef } = await renderRun(
      ['A'],
      <Controller />,
      runRepository,
      'old-caller://result',
    );
    await waitFor(() => screen.getByText('A'));

    await act(async () => {
      navigationRef.current?.goBack();
    });
    await act(async () => {
      replaceRun?.();
    });
    await waitFor(() =>
      expect(observedRun.current?.checklistId).toBe(replacementChecklist.id),
    );

    await act(async () => {
      confirmStaleDiscard?.();
    });

    expect(observedRun.current?.checklistId).toBe(replacementChecklist.id);
    expect(navigationRef.current?.getCurrentRoute()?.name).toBe('Run');
    expect(openUrlSpy).not.toHaveBeenCalled();
  });

  it('preserves a replacement run when the displaced run finishes saving', async () => {
    const replacementChecklist = {
      ...createChecklist('Hardware store'),
      items: [createItem('Screws')],
    };
    const observedRun: {
      current: ReturnType<typeof useRuns>['activeRun'];
    } = { current: null };
    let replaceRun: (() => void) | undefined;
    let finishSaving: (() => void) | undefined;
    let savedHistory: Awaited<ReturnType<RunRepository['getAll']>> = [];
    const savePending = new Promise<void>(resolve => {
      finishSaving = resolve;
    });
    const delayedRepository: RunRepository = {
      getAll: jest.fn().mockResolvedValue([]),
      saveAll: jest.fn(async history => {
        savedHistory = history;
        await savePending;
      }),
    };

    function Controller() {
      const { activeRun, startExternalRun } = useRuns();
      observedRun.current = activeRun;
      replaceRun = () =>
        startExternalRun(replacementChecklist, 'new-caller://result');
      return null;
    }

    const openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const { checklist, navigationRef } = await renderRun(
      ['A'],
      <Controller />,
      delayedRepository,
      'old-caller://result',
    );
    await waitFor(() => screen.getByText('A'));
    await fireEvent.press(screen.getByText('A'));
    fireEvent.press(screen.getByLabelText('Complete the checklist'));
    await waitFor(() => expect(delayedRepository.saveAll).toHaveBeenCalled());

    await act(async () => {
      replaceRun?.();
    });
    await waitFor(() => screen.getByText('Screws'));
    await act(async () => {
      finishSaving?.();
      await savePending;
    });

    await waitFor(() =>
      expect(observedRun.current?.checklistId).toBe(replacementChecklist.id),
    );
    expect(navigationRef.current?.getCurrentRoute()?.name).toBe('Run');
    expect(savedHistory).toEqual([
      expect.objectContaining({ checklistId: checklist.id }),
    ]);
    expect(openUrlSpy).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Screws'));
    expect(
      screen.getByText('Screws').parent?.parent?.props.accessibilityState,
    ).toEqual(expect.objectContaining({ checked: true }));
  });

  it('preserves a replacement run started after the displaced run is saved', async () => {
    const replacementChecklist = {
      ...createChecklist('Hardware store'),
      items: [createItem('Screws')],
    };
    const observedRun: {
      current: ReturnType<typeof useRuns>['activeRun'];
    } = { current: null };
    let replaceRun: (() => void) | undefined;

    function Controller() {
      const { activeRun, startExternalRun } = useRuns();
      observedRun.current = activeRun;
      replaceRun = () =>
        startExternalRun(replacementChecklist, 'new-caller://result');
      return null;
    }

    jest.spyOn(analytics, 'logEvent').mockImplementation(eventName => {
      if (eventName === 'run_completed') {
        replaceRun?.();
      }
    });
    const openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const { checklist, navigationRef } = await renderRun(
      ['A'],
      <Controller />,
      runRepository,
      'old-caller://result',
    );
    await waitFor(() => screen.getByText('A'));
    await fireEvent.press(screen.getByText('A'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Complete the checklist'));
    });

    await waitFor(() =>
      expect(observedRun.current?.checklistId).toBe(replacementChecklist.id),
    );
    expect(navigationRef.current?.getCurrentRoute()?.name).toBe('Run');
    expect(await runRepository.getAll()).toEqual([
      expect.objectContaining({ checklistId: checklist.id }),
    ]);
    expect(openUrlSpy).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Screws'));
    expect(
      screen.getByText('Screws').parent?.parent?.props.accessibilityState,
    ).toEqual(expect.objectContaining({ checked: true }));
  });

  it('does not report a displaced save failure after a replacement run starts', async () => {
    const replacementChecklist = {
      ...createChecklist('Hardware store'),
      items: [createItem('Screws')],
    };
    const observedRun: {
      current: ReturnType<typeof useRuns>['activeRun'];
    } = { current: null };
    let replaceRun: (() => void) | undefined;
    let failSaving: (() => void) | undefined;
    const savePending = new Promise<void>((_resolve, reject) => {
      failSaving = () => reject(new Error('storage failed'));
    });
    const delayedRepository: RunRepository = {
      getAll: jest.fn().mockResolvedValue([]),
      saveAll: jest.fn(() => savePending),
    };

    function Controller() {
      const { activeRun, startExternalRun } = useRuns();
      observedRun.current = activeRun;
      replaceRun = () =>
        startExternalRun(replacementChecklist, 'new-caller://result');
      return null;
    }

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const { navigationRef } = await renderRun(
      ['A'],
      <Controller />,
      delayedRepository,
      'old-caller://result',
    );
    await waitFor(() => screen.getByText('A'));
    await fireEvent.press(screen.getByText('A'));
    fireEvent.press(screen.getByLabelText('Complete the checklist'));
    await waitFor(() => expect(delayedRepository.saveAll).toHaveBeenCalled());

    await act(async () => {
      replaceRun?.();
    });
    await waitFor(() => screen.getByText('Screws'));
    await act(async () => {
      failSaving?.();
      await savePending.catch(() => undefined);
      await Promise.resolve();
    });

    expect(observedRun.current?.checklistId).toBe(replacementChecklist.id);
    expect(navigationRef.current?.getCurrentRoute()?.name).toBe('Run');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(openUrlSpy).not.toHaveBeenCalled();
  });

  it('does not cancel a run while its completion is being saved', async () => {
    let finishSaving: (() => void) | undefined;
    let savedHistory: Awaited<ReturnType<RunRepository['getAll']>> = [];
    const savePending = new Promise<void>(resolve => {
      finishSaving = resolve;
    });
    const delayedRepository: RunRepository = {
      getAll: jest.fn().mockResolvedValue([]),
      saveAll: jest.fn(async history => {
        savedHistory = history;
        await savePending;
      }),
    };
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) => {
        buttons?.find(button => button.text === 'Discard')?.onPress?.();
      });
    const openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const { navigationRef } = await renderRun(
      ['A'],
      null,
      delayedRepository,
      'caller-app://result',
    );
    await waitFor(() => screen.getByText('A'));
    await fireEvent.press(screen.getByText('A'));
    fireEvent.press(screen.getByLabelText('Complete the checklist'));
    await waitFor(() => expect(delayedRepository.saveAll).toHaveBeenCalled());

    await act(async () => {
      navigationRef.current?.goBack();
    });
    await act(async () => {
      finishSaving?.();
      await savePending;
    });

    await waitFor(() => expect(openUrlSpy).toHaveBeenCalledTimes(1));
    expect(alertSpy).not.toHaveBeenCalled();
    expect(navigationRef.current?.getCurrentRoute()?.name).toBe('Placeholder');
    const callbackUrl = new URL(openUrlSpy.mock.calls[0][0]);
    expect(callbackUrl.searchParams.get('status')).toBe('completed');
    expect(savedHistory).toHaveLength(1);
  });

  it('keeps the external run outcome committed when callback delivery fails', async () => {
    let capturedActiveRun: unknown;
    jest.spyOn(analytics, 'logEvent');

    function Observer() {
      const { activeRun } = useRuns();
      capturedActiveRun = activeRun;
      return null;
    }

    jest
      .spyOn(Linking, 'openURL')
      .mockRejectedValue(new Error('caller unavailable'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { navigationRef } = await renderRun(
      ['A'],
      <Observer />,
      runRepository,
      'caller-app://result',
    );
    await waitFor(() => screen.getByText('A'));

    await fireEvent.press(screen.getByText('A'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Complete the checklist'));
    });

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Could not return the result to the calling app.',
      ),
    );
    expect(await runRepository.getAll()).toHaveLength(1);
    expect(capturedActiveRun).toBeNull();
    expect(navigationRef.current?.getCurrentRoute()?.name).toBe('Placeholder');
    expect(analytics.logEvent).toHaveBeenCalledWith(
      'external_run_callback_finished',
      { status: 'completed', delivered: false },
    );
  });

  it('keeps normal runs free of external warnings and callbacks', async () => {
    const openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    await renderRun(['A']);
    await waitFor(() => screen.getByText('A'));

    expect(
      screen.queryByText(
        'Started by another app. Finishing or cancelling returns you to that app.',
      ),
    ).toBeNull();

    await fireEvent.press(screen.getByText('A'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Complete the checklist'));
    });

    await waitFor(() => expect(screen.queryByText('A')).toBeNull());
    expect(openUrlSpy).not.toHaveBeenCalled();
  });
});
