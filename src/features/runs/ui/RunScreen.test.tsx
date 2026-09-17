import React, { useEffect, useRef } from 'react';
import {
  render,
  fireEvent,
  waitFor,
  screen,
  act,
} from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RunsProvider, useRuns } from '../useRuns';
import { RunScreen } from './RunScreen';
import { analytics } from '../../../shared/analytics/AnalyticsService';
import { createChecklist, createItem } from '../../checklists/domain/models';
import { AsyncStorageChecklistRepository } from '../../checklists/data/asyncStorageChecklistRepository';

function createMockNavigation() {
  const listeners: Record<string, (event: any) => void> = {};
  return {
    setOptions: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    addListener: jest.fn((event: string, callback: (event: any) => void) => {
      listeners[event] = callback;
      return jest.fn();
    }),
    emit: (event: string, payload: any) => listeners[event]?.(payload),
  };
}

function Harness({
  checklist,
  navigation,
}: {
  checklist: ReturnType<typeof createChecklist>;
  navigation: any;
}) {
  const { startRun } = useRuns();
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      startRun(checklist);
    }
  }, [checklist, startRun]);

  return (
    <RunScreen
      navigation={navigation}
      route={{ params: { checklistId: checklist.id } } as any}
    />
  );
}

async function renderRun(itemTexts: string[], navigation = createMockNavigation()) {
  const checklist = {
    ...createChecklist('Groceries'),
    items: itemTexts.map(createItem),
  };

  const utils = await render(
    <RunsProvider>
      <Harness checklist={checklist} navigation={navigation} />
    </RunsProvider>,
  );

  return { checklist, navigation, ...utils };
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

    const completeButton = () => screen.getByLabelText('Complete the checklist');
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
    const navigation = createMockNavigation();
    let capturedActiveRun: unknown;

    function Observer() {
      const { activeRun } = useRuns();
      capturedActiveRun = activeRun;
      return null;
    }

    const checklist = { ...createChecklist('Groceries'), items: [createItem('A')] };

    await render(
      <RunsProvider>
        <Harness checklist={checklist} navigation={navigation} />
        <Observer />
      </RunsProvider>,
    );
    await waitFor(() => screen.getByText('A'));

    await fireEvent.press(screen.getByText('A'));
    await fireEvent.press(screen.getByLabelText('Complete the checklist'));

    expect(navigation.goBack).toHaveBeenCalled();
    expect(capturedActiveRun).toBeNull();
  });

  it('exiting before completion prompts confirmation; confirming discards the run, cancelling preserves it', async () => {
    const navigation = createMockNavigation();
    let capturedActiveRun: unknown;

    function Observer() {
      const { activeRun } = useRuns();
      capturedActiveRun = activeRun;
      return null;
    }

    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('A'), createItem('B')],
    };

    await render(
      <RunsProvider>
        <Harness checklist={checklist} navigation={navigation} />
        <Observer />
      </RunsProvider>,
    );
    await waitFor(() => screen.getByText('A'));
    await fireEvent.press(screen.getByText('A'));

    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _msg, buttons) => {
        buttons?.find(b => b.text === 'Cancel')?.onPress?.();
      });
    const preventDefault = jest.fn();
    await act(async () => {
      navigation.emit('beforeRemove', {
        preventDefault,
        data: { action: { type: 'GO_BACK' } },
      });
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Are you sure?',
      expect.any(String),
      expect.any(Array),
    );
    // Cancelled: progress preserved.
    const rowA = screen.getByText('A').parent?.parent;
    expect(rowA?.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
    expect(capturedActiveRun).not.toBeNull();

    alertSpy.mockImplementation((_title, _msg, buttons) => {
      buttons?.find(b => b.text === 'Discard')?.onPress?.();
    });
    const preventDefault2 = jest.fn();
    await act(async () => {
      navigation.emit('beforeRemove', {
        preventDefault: preventDefault2,
        data: { action: { type: 'GO_BACK' } },
      });
    });

    expect(capturedActiveRun).toBeNull();
    expect(navigation.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' });
  });

  it('pressing the visible back button also triggers the exit-confirmation flow', async () => {
    const navigation = createMockNavigation();
    const checklist = { ...createChecklist('Groceries'), items: [createItem('A')] };

    await render(
      <RunsProvider>
        <Harness checklist={checklist} navigation={navigation} />
      </RunsProvider>,
    );
    await waitFor(() => screen.getByText('A'));

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await act(async () => {
      navigation.emit('beforeRemove', {
        preventDefault: jest.fn(),
        data: { action: { type: 'GO_BACK' } },
      });
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Are you sure?',
      expect.any(String),
      expect.any(Array),
    );
  });

  it('logs run analytics with the documented properties', async () => {
    const logEventSpy = jest.spyOn(analytics, 'logEvent');
    const logScreenViewSpy = jest.spyOn(analytics, 'logScreenView');
    const navigation = createMockNavigation();
    const checklist = {
      ...createChecklist('Groceries'),
      id: '1',
      items: [createItem('A'), createItem('B')],
    };

    await render(
      <RunsProvider>
        <Harness checklist={checklist} navigation={navigation} />
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
    await fireEvent.press(screen.getByLabelText('Complete the checklist'));

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

    const navigation = createMockNavigation();
    const checklist = (await repo.getAll())[0];

    await render(
      <RunsProvider>
        <Harness checklist={checklist} navigation={navigation} />
      </RunsProvider>,
    );
    await waitFor(() => screen.getByText('A'));

    await fireEvent.press(screen.getByText('A'));
    await fireEvent.press(screen.getByText('B'));
    await fireEvent.press(screen.getByLabelText('Complete the checklist'));

    const stored = (await repo.getAll())[0];
    expect(stored.items).toEqual([
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ]);

    await AsyncStorage.clear();
  });

  it('shows a defensive empty state if the screen mounts with no active run', async () => {
    const navigation = createMockNavigation();

    await render(
      <RunsProvider>
        <RunScreen
          navigation={navigation as any}
          route={{ params: { checklistId: '1' } } as any}
        />
      </RunsProvider>,
    );

    await waitFor(() => expect(screen.getByText(/no active run/i)).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('Back'));
    expect(navigation.goBack).toHaveBeenCalled();
  });
});
