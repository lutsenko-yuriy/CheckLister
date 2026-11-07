import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { analytics } from '../../../shared/analytics/AnalyticsService';
import * as killSwitches from '../../../shared/killSwitches/useKillSwitches';
import { AsyncStorageRunRepository } from '../data/asyncStorageRunRepository';
import { Attachment, RunHistoryEntry } from '../domain/models';
import { RunsProvider } from '../useRuns';
import { photoDeps } from '../testing/photoFakes';
import { RunDetailScreen } from './RunDetailScreen';
import { ThemeProvider } from '../../../shared/theme/useTheme';

const photo = (id: string): Attachment => ({
  id,
  kind: 'photo',
  path: `attachments/r/${id}.jpg`,
  addedAt: '2026-09-18T18:00:00.000Z',
});

const detailed: RunHistoryEntry = {
  id: 'r',
  checklistId: 'packing',
  checklistTitle: 'Packing',
  itemCount: 2,
  completedAt: '2026-09-18T18:42:00.000Z',
  items: [
    { id: 'i1', text: 'Passport', checked: true, photo: photo('att-1') },
    { id: 'i2', text: 'Charger', checked: false, photo: null },
  ],
  photos: [photo('att-2')],
};

const legacy: RunHistoryEntry = {
  id: 'old',
  checklistId: 'packing',
  checklistTitle: 'Packing',
  itemCount: 3,
  completedAt: '2026-08-01T10:00:00.000Z',
};

async function renderDetail(runId: string) {
  const repository = new AsyncStorageRunRepository();
  await repository.saveAll([detailed, legacy]);
  const navigation = { navigate: jest.fn() };
  await render(
    <ThemeProvider>
      <RunsProvider repository={repository} {...photoDeps()}>
        <RunDetailScreen
          navigation={navigation as any}
          route={{ params: { runId } } as any}
        />
      </RunsProvider>
    </ThemeProvider>,
  );
  return { navigation };
}

describe('RunDetailScreen', () => {
  beforeEach(() => {
    jest.spyOn(killSwitches, 'useKillSwitch').mockReturnValue(true);
    jest.spyOn(analytics, 'logScreenView');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lists every item with its checked state, without any edit controls', async () => {
    await renderDetail('r');

    await waitFor(() => expect(screen.getByText('Passport')).toBeTruthy());
    expect(
      screen.getByTestId('run-detail-item-i1').props.accessibilityState,
    ).toEqual({ checked: true });
    expect(
      screen.getByTestId('run-detail-item-i2').props.accessibilityState,
    ).toEqual({ checked: false });
    expect(screen.queryByTestId('add-run-photo')).toBeNull();
    expect(screen.queryByTestId('add-item-photo-i2')).toBeNull();
  });

  it('shows item and run photos and opens them in the past-run viewer', async () => {
    const { navigation } = await renderDetail('r');

    await waitFor(() =>
      expect(screen.getByTestId('photo-thumbnail-att-1')).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId('photo-thumbnail-att-1'));
    expect(navigation.navigate).toHaveBeenCalledWith('PhotoViewer', {
      context: 'past_run',
      runId: 'r',
      attachmentId: 'att-1',
    });

    await fireEvent.press(screen.getByTestId('photo-thumbnail-att-2'));
    expect(navigation.navigate).toHaveBeenLastCalledWith('PhotoViewer', {
      context: 'past_run',
      runId: 'r',
      attachmentId: 'att-2',
    });
  });

  it('logs screen_run_detail once with the photo counts', async () => {
    await renderDetail('r');

    await waitFor(() =>
      expect(analytics.logScreenView).toHaveBeenCalledWith(
        'screen_run_detail',
        {
          checklist_id: 'packing',
          item_count: 2,
          item_photo_count: 1,
          run_photo_count: 1,
        },
      ),
    );
    expect(analytics.logScreenView).toHaveBeenCalledTimes(1);
  });

  it('hides photos when the kill-switch is off but keeps the items', async () => {
    jest.spyOn(killSwitches, 'useKillSwitch').mockReturnValue(false);
    await renderDetail('r');

    await waitFor(() => expect(screen.getByText('Passport')).toBeTruthy());
    expect(screen.queryByTestId('photo-thumbnail-att-1')).toBeNull();
    expect(screen.queryByTestId('photo-thumbnail-att-2')).toBeNull();
    await waitFor(() =>
      expect(analytics.logScreenView).toHaveBeenCalledWith(
        'screen_run_detail',
        {
          checklist_id: 'packing',
          item_count: 2,
          item_photo_count: 0,
          run_photo_count: 0,
        },
      ),
    );
  });

  it('says details were not recorded for a run saved before photos', async () => {
    await renderDetail('old');

    await waitFor(() =>
      expect(
        screen.getByText("Details weren't recorded for this run."),
      ).toBeTruthy(),
    );
    expect(screen.getByText('Packing')).toBeTruthy();
    expect(screen.getByText(/^3 items/)).toBeTruthy();
  });
});
