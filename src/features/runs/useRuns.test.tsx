import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createChecklist, createItem } from '../checklists/domain/models';
import { AsyncStorageRunRepository } from './data/asyncStorageRunRepository';
import { RunHistoryEntry } from './domain/models';
import { RunRepository } from './domain/runRepository';
import { RunsProvider, useRuns } from './useRuns';

function makeWrapper(repository: RunRepository) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <RunsProvider repository={repository}>{children}</RunsProvider>;
  };
}

describe('useRuns', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('has no active run and empty loaded history initially', async () => {
    const repository = new AsyncStorageRunRepository();
    const { result } = await renderHook(() => useRuns(), {
      wrapper: makeWrapper(repository),
    });

    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    expect(result.current.activeRun).toBeNull();
    expect(result.current.history).toEqual([]);
  });

  it('loads durable history newest-first', async () => {
    const repository = new AsyncStorageRunRepository();
    await repository.saveAll([
      {
        id: 'older',
        checklistId: '1',
        checklistTitle: 'Groceries',
        itemCount: 7,
        completedAt: '2026-09-17T08:00:00.000Z',
      },
      {
        id: 'newer',
        checklistId: '1',
        checklistTitle: 'Groceries',
        itemCount: 8,
        completedAt: '2026-09-18T08:00:00.000Z',
      },
    ]);

    const { result } = await renderHook(() => useRuns(), {
      wrapper: makeWrapper(repository),
    });

    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    expect(result.current.history.map(entry => entry.id)).toEqual([
      'newer',
      'older',
    ]);
  });

  it('starting a run exposes it as the active run', async () => {
    const { result } = await renderHook(() => useRuns(), {
      wrapper: makeWrapper(new AsyncStorageRunRepository()),
    });
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk')],
    };

    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    await act(async () => {
      result.current.startRun(checklist);
    });

    expect(result.current.activeRun?.checklistId).toBe(checklist.id);
    expect(result.current.activeRun?.items).toHaveLength(1);
  });

  it('toggling an item updates only the targeted item', async () => {
    const { result } = await renderHook(() => useRuns(), {
      wrapper: makeWrapper(new AsyncStorageRunRepository()),
    });
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk'), createItem('Eggs')],
    };

    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    await act(async () => {
      result.current.startRun(checklist);
    });
    const targetId = result.current.activeRun!.items[0].id;
    await act(async () => {
      result.current.toggleItem(targetId);
    });

    expect(result.current.activeRun!.items[0].checked).toBe(true);
    expect(result.current.activeRun!.items[1].checked).toBe(false);
  });

  it('completing a run stores one immutable history summary', async () => {
    const repository = new AsyncStorageRunRepository();
    const { result } = await renderHook(() => useRuns(), {
      wrapper: makeWrapper(repository),
    });
    const checklist = {
      ...createChecklist('Groceries'),
      id: 'checklist-1',
      items: [createItem('Milk'), createItem('Eggs')],
    };

    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    await act(async () => {
      result.current.startRun(checklist);
    });
    await act(async () => result.current.completeRun());

    expect(result.current.activeRun?.completedAt).not.toBeNull();
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]).toEqual(
      expect.objectContaining({
        checklistId: 'checklist-1',
        checklistTitle: 'Groceries',
        itemCount: 2,
      }),
    );
    await waitFor(async () =>
      expect(await repository.getAll()).toEqual(result.current.history),
    );
  });

  it('discarding an active run does not add history', async () => {
    const repository = new AsyncStorageRunRepository();
    const { result } = await renderHook(() => useRuns(), {
      wrapper: makeWrapper(repository),
    });
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk')],
    };

    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    await act(async () => {
      result.current.startRun(checklist);
    });
    await act(async () => {
      result.current.clearRun();
    });

    expect(result.current.activeRun).toBeNull();
    expect(result.current.history).toEqual([]);
    expect(await repository.getAll()).toEqual([]);
  });

  it('does not let a late initial load overwrite a completed run', async () => {
    let resolveLoad!: (entries: RunHistoryEntry[]) => void;
    const repository: RunRepository = {
      getAll: jest.fn(
        () =>
          new Promise<RunHistoryEntry[]>(resolve => {
            resolveLoad = resolve;
          }),
      ),
      saveAll: jest.fn().mockResolvedValue(undefined),
    };
    const { result } = await renderHook(() => useRuns(), {
      wrapper: makeWrapper(repository),
    });
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk')],
    };

    await act(async () => {
      result.current.startRun(checklist);
    });
    await act(async () => result.current.completeRun());
    await act(async () => resolveLoad([]));

    expect(result.current.history).toHaveLength(1);
    expect(result.current.historyLoading).toBe(false);
  });

  it('throws when used outside a RunsProvider', async () => {
    await expect(renderHook(() => useRuns())).rejects.toThrow(
      'useRuns must be used within a RunsProvider',
    );
  });
});
