import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from '@testing-library/react-native';
import { ChecklistsProvider } from '../useChecklists';
import { AsyncStorageChecklistRepository } from '../data/asyncStorageChecklistRepository';
import { ChecklistDetailScreen } from './ChecklistDetailScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../../shared/theme/colors';
import { RunsProvider } from '../../runs/useRuns';
import { AsyncStorageRunRepository } from '../../runs/data/asyncStorageRunRepository';
import { analytics } from '../../../shared/analytics/AnalyticsService';

function createMockNavigation() {
  return { setOptions: jest.fn(), navigate: jest.fn() };
}

async function renderDetailScreen(
  checklistId: string,
  navigation = createMockNavigation(),
  runRepository = new AsyncStorageRunRepository(),
) {
  const utils = await render(
    <ChecklistsProvider repository={new AsyncStorageChecklistRepository()}>
      <RunsProvider repository={runRepository}>
        <ChecklistDetailScreen
          navigation={navigation as any}
          route={{ params: { checklistId } } as any}
        />
      </RunsProvider>
    </ChecklistsProvider>,
  );
  return { navigation, ...utils };
}

describe('ChecklistDetailScreen', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it("shows the checklist's title and a placeholder for items", async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([{ id: '1', title: 'Groceries', items: [] }]);

    await renderDetailScreen('1');

    await waitFor(() => expect(screen.getByText('Groceries')).toBeTruthy());
    expect(screen.getByText(/no items yet/i)).toBeTruthy();
  });

  it('shows a not-found message if the checklist no longer exists', async () => {
    await renderDetailScreen('missing');

    await waitFor(() =>
      expect(screen.getByText(/checklist not found/i)).toBeTruthy(),
    );
  });

  it('hides checklist history when there are no completed runs for it', async () => {
    const checklistRepository = new AsyncStorageChecklistRepository();
    await checklistRepository.saveAll([
      { id: '1', title: 'Groceries', items: [] },
    ]);
    const runRepository = new AsyncStorageRunRepository();
    await runRepository.saveAll([
      {
        id: 'other-run',
        checklistId: 'other',
        checklistTitle: 'Packing',
        itemCount: 2,
        completedAt: '2026-09-18T12:00:00.000Z',
      },
    ]);

    const { navigation } = await renderDetailScreen(
      '1',
      createMockNavigation(),
      runRepository,
    );

    await waitFor(() => expect(screen.getByText('Groceries')).toBeTruthy());
    const calls = navigation.setOptions.mock.calls;
    const options = calls[calls.length - 1][0];
    expect(options.headerRight).toBeUndefined();
    expect(options.unstable_headerRightItems).toBeUndefined();
  });

  it('opens history filtered to the current checklist', async () => {
    const checklistRepository = new AsyncStorageChecklistRepository();
    await checklistRepository.saveAll([
      { id: '1', title: 'Groceries', items: [] },
    ]);
    const runRepository = new AsyncStorageRunRepository();
    await runRepository.saveAll([
      {
        id: 'run-1',
        checklistId: '1',
        checklistTitle: 'Groceries',
        itemCount: 2,
        completedAt: '2026-09-18T12:00:00.000Z',
      },
    ]);
    const navigation = createMockNavigation();

    await renderDetailScreen('1', navigation, runRepository);

    await waitFor(() => {
      const calls = navigation.setOptions.mock.calls;
      expect(calls[calls.length - 1][0].headerRight).toEqual(
        expect.any(Function),
      );
    });
    const calls = navigation.setOptions.mock.calls;
    const options = calls[calls.length - 1][0];
    const HeaderAction = options.headerRight;
    const header = await render(<HeaderAction />);
    fireEvent.press(header.getByLabelText('Run history'));

    expect(navigation.navigate).toHaveBeenCalledWith('RunHistory', {
      checklistId: '1',
      checklistTitle: 'Groceries',
    });
    expect(options.unstable_headerRightItems()[0]).toEqual(
      expect.objectContaining({
        type: 'custom',
        hidesSharedBackground: true,
      }),
    );
  });

  it('adds an item from the input and clears it afterwards', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([{ id: '1', title: 'Groceries', items: [] }]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByPlaceholderText('New item'));

    await fireEvent.changeText(screen.getByPlaceholderText('New item'), 'Milk');
    await fireEvent.press(screen.getByLabelText('Add'));

    await waitFor(() => expect(screen.getByText('Milk')).toBeTruthy());
    expect(screen.getByPlaceholderText('New item').props.value).toBe('');
  });

  it("edits an item's text", async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [{ id: 'a', text: 'Milk' }],
      },
    ]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByText('Milk'));

    await fireEvent.press(screen.getByLabelText('Edit'));
    await fireEvent.changeText(screen.getByDisplayValue('Milk'), 'Oat milk');
    await fireEvent.press(screen.getByLabelText('Save'));

    await waitFor(() => expect(screen.getByText('Oat milk')).toBeTruthy());
    expect((await repo.getAll())[0].items[0].text).toBe('Oat milk');
  });

  it('deletes an item', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [{ id: 'a', text: 'Milk' }],
      },
    ]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByText('Milk'));

    await fireEvent.press(screen.getByLabelText('Delete'));

    await waitFor(() => expect(screen.queryByText('Milk')).toBeNull());
    expect((await repo.getAll())[0].items).toHaveLength(0);
  });

  // Drag gestures are driven through a mocked react-native-reanimated-dnd
  // (__mocks__/react-native-reanimated-dnd.js) that exposes drag completion
  // as `fireEvent(getByTestId('sortable-item-<itemId>'), 'drop', { to })`.

  it('reorders items via drag', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
          { id: 'c', text: 'C' },
        ],
      },
    ]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByText('A'));

    // Item 'A' dropped at index 2 (after 'C'): new order is B, C, A.
    await fireEvent(screen.getByTestId('sortable-item-a'), 'drop', {
      to: 2,
    });

    await waitFor(async () => {
      const items = (await repo.getAll())[0].items;
      expect(items.map(i => i.text)).toEqual(['B', 'C', 'A']);
    });
  });

  it('item row has an opaque background so rows behind it never show through while reordering', async () => {
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

    await renderDetailScreen('1');
    await waitFor(() => screen.getByText('A'));

    const row = screen.getByTestId('sortable-item-a');
    const rowContent = (row.children[0] as any).props.style;

    expect(rowContent).toEqual(
      expect.objectContaining({ backgroundColor: colors.surface }),
    );
  });

  // CheL-4 WU3: "Start run" entry point.
  it('disables "Start run" for an empty checklist', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([{ id: '1', title: 'Groceries', items: [] }]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByText('Groceries'));

    const button = screen.getByLabelText('Start run');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('starts a run and navigates to the Run screen on press', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [
          { id: 'a', text: 'Milk' },
          { id: 'b', text: 'Eggs' },
        ],
      },
    ]);
    const logEventSpy = jest.spyOn(analytics, 'logEvent');

    const { navigation } = await renderDetailScreen('1');
    await waitFor(() => screen.getByText('Groceries'));

    await fireEvent.press(screen.getByLabelText('Start run'));

    expect(navigation.navigate).toHaveBeenCalledWith('Run', {
      checklistId: '1',
    });
    expect(logEventSpy).toHaveBeenCalledWith('run_started', {
      checklist_id: '1',
      item_count: 2,
    });
  });
});
