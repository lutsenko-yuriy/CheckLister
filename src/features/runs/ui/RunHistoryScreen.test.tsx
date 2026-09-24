import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react-native';
import { analytics } from '../../../shared/analytics/AnalyticsService';
import { AsyncStorageRunRepository } from '../data/asyncStorageRunRepository';
import { RunHistoryEntry } from '../domain/models';
import { RunsProvider } from '../useRuns';
import { RunHistoryScreen } from './RunHistoryScreen';
import { darkPalette } from '../../../shared/theme/palette';
import { ThemeProvider } from '../../../shared/theme/useTheme';
import { formatDateTime } from '../../../shared/i18n/translate';

const packing: RunHistoryEntry = {
  id: 'newer',
  checklistId: 'packing',
  checklistTitle: 'Packing',
  itemCount: 8,
  completedAt: '2026-09-18T18:42:00.000Z',
};

const groceries: RunHistoryEntry = {
  id: 'older',
  checklistId: 'groceries',
  checklistTitle: 'Groceries',
  itemCount: 7,
  completedAt: '2026-09-17T09:15:00.000Z',
};

async function renderHistory(
  params: {
    checklistId?: string;
    checklistTitle?: string;
  },
  scheme?: 'light' | 'dark',
) {
  const repository = new AsyncStorageRunRepository();
  await repository.saveAll([groceries, packing]);
  const navigation = { setOptions: jest.fn() };

  const utils = await render(
    <ThemeProvider scheme={scheme}>
      <RunsProvider repository={repository}>
        <RunHistoryScreen
          navigation={navigation as any}
          route={{ params } as any}
        />
      </RunsProvider>
    </ThemeProvider>,
  );
  return { navigation, ...utils };
}

describe('RunHistoryScreen', () => {
  it('renders global history newest-first with snapshotted item counts', async () => {
    await renderHistory({});

    await waitFor(() => expect(screen.getByText('Packing')).toBeTruthy());
    const rows = screen.getAllByTestId(/run-history-entry-/);
    expect(within(rows[0]).getByText('Packing')).toBeTruthy();
    expect(
      within(rows[0]).getByText(
        `8 items • Run on ${formatDateTime(
          'en',
          undefined,
          packing.completedAt,
        )}`,
      ),
    ).toBeTruthy();
    expect(within(rows[1]).getByText('Groceries')).toBeTruthy();
  });

  it('filters by checklist and configures the checklist-specific title', async () => {
    const logScreenView = jest.spyOn(analytics, 'logScreenView');
    const { navigation } = await renderHistory({
      checklistId: 'groceries',
      checklistTitle: 'Groceries',
    });

    await waitFor(() => expect(screen.getByText('Groceries')).toBeTruthy());
    expect(screen.queryByText('Packing')).toBeNull();
    expect(navigation.setOptions).toHaveBeenCalledWith({
      title: 'Groceries history',
    });
    expect(logScreenView).toHaveBeenCalledWith('screen_run_history', {
      scope: 'checklist',
      entry_count: 1,
      checklist_id: 'groceries',
    });
  });

  it('logs the global history screen without a checklist id', async () => {
    const logScreenView = jest.spyOn(analytics, 'logScreenView');

    await renderHistory({});

    await waitFor(() =>
      expect(logScreenView).toHaveBeenCalledWith('screen_run_history', {
        scope: 'all',
        entry_count: 2,
      }),
    );
  });

  it('renders with the dark palette when in dark mode', async () => {
    await renderHistory({}, 'dark');

    await waitFor(() => expect(screen.getByText('Packing')).toBeTruthy());
    expect(screen.getByTestId('run-history-screen').props.style).toEqual(
      expect.objectContaining({ backgroundColor: darkPalette.background }),
    );
  });
});
