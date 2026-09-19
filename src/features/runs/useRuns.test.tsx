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
    expect(result.current.activeRun?.origin).toEqual({ type: 'local' });
  });

  it('starts an external run with its callback origin', async () => {
    const { result } = await renderHook(() => useRuns(), {
      wrapper: makeWrapper(new AsyncStorageRunRepository()),
    });
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk')],
    };

    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    await act(async () => {
      result.current.startExternalRun(
        checklist,
        'caller-app://run-result?source=widget',
      );
    });

    expect(result.current.activeRun?.origin).toEqual({
      type: 'external',
      callbackUrl: 'caller-app://run-result?source=widget',
    });
  });

  it('replaces an active run with a fresh external run of the same checklist', async () => {
    const { result } = await renderHook(() => useRuns(), {
      wrapper: makeWrapper(new AsyncStorageRunRepository()),
    });
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk')],
    };

    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    await act(async () => {
      result.current.startExternalRun(checklist, 'first-app://result');
    });
    const firstRunId = result.current.activeRun?.id;
    await act(async () => {
      result.current.startExternalRun(checklist, 'second-app://result');
    });

    expect(result.current.activeRun?.id).not.toBe(firstRunId);
    expect(result.current.activeRun?.origin).toEqual({
      type: 'external',
      callbackUrl: 'second-app://result',
    });
  });

  it('replaces a run of another checklist without retaining its callback', async () => {
    const { result } = await renderHook(() => useRuns(), {
      wrapper: makeWrapper(new AsyncStorageRunRepository()),
    });
    const groceries = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk')],
    };
    const packing = {
      ...createChecklist('Packing'),
      items: [createItem('Passport')],
    };

    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    await act(async () => {
      result.current.startExternalRun(groceries, 'first-app://result');
    });
    await act(async () => {
      result.current.startExternalRun(packing, 'second-app://result');
    });

    expect(result.current.activeRun?.checklistId).toBe(packing.id);
    expect(JSON.stringify(result.current.activeRun)).not.toContain('first-app');
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
    const olderEntry: RunHistoryEntry = {
      id: 'older',
      checklistId: 'older-checklist',
      checklistTitle: 'Packing',
      itemCount: 4,
      completedAt: '2026-09-17T08:00:00.000Z',
    };
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
    await act(async () => {
      const completion = result.current.completeRun();
      resolveLoad([olderEntry]);
      await completion;
    });

    expect(result.current.history.map(entry => entry.id)).toEqual([
      result.current.activeRun!.id,
      'older',
    ]);
    expect(repository.saveAll).toHaveBeenCalledWith(result.current.history);
    expect(result.current.historyLoading).toBe(false);
  });

  it('keeps the active run recoverable when history persistence fails', async () => {
    const repository: RunRepository = {
      getAll: jest.fn().mockResolvedValue([]),
      saveAll: jest.fn().mockRejectedValue(new Error('storage failed')),
    };
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
      await expect(result.current.completeRun()).rejects.toThrow(
        'storage failed',
      );
    });

    expect(result.current.activeRun?.completedAt).toBeNull();
    expect(result.current.history).toEqual([]);
  });

  it('serializes overlapping completions so replacement-run history is not lost', async () => {
    const saveResolvers: Array<() => void> = [];
    const repository: RunRepository = {
      getAll: jest.fn().mockResolvedValue([]),
      saveAll: jest.fn(
        () =>
          new Promise<void>(resolve => {
            saveResolvers.push(resolve);
          }),
      ),
    };
    const { result } = await renderHook(() => useRuns(), {
      wrapper: makeWrapper(repository),
    });
    const firstChecklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk')],
    };
    const secondChecklist = {
      ...createChecklist('Hardware store'),
      items: [createItem('Screws')],
    };

    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    await act(async () => {
      result.current.startExternalRun(firstChecklist, 'first-app://result');
    });
    const firstRunId = result.current.activeRun?.id;
    let firstCompletion = Promise.resolve();
    await act(async () => {
      firstCompletion = result.current.completeRun();
      await Promise.resolve();
    });
    await waitFor(() => expect(repository.saveAll).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.startExternalRun(secondChecklist, 'second-app://result');
    });
    const secondRunId = result.current.activeRun?.id;
    let secondCompletion = Promise.resolve();
    await act(async () => {
      secondCompletion = result.current.completeRun();
      await Promise.resolve();
    });

    expect(repository.saveAll).toHaveBeenCalledTimes(1);
    await act(async () => {
      saveResolvers[0]?.();
      await firstCompletion;
    });
    await waitFor(() => expect(repository.saveAll).toHaveBeenCalledTimes(2));
    await act(async () => {
      saveResolvers[1]?.();
      await secondCompletion;
    });

    expect(new Set(result.current.history.map(entry => entry.id))).toEqual(
      new Set([firstRunId, secondRunId]),
    );
    expect(repository.saveAll).toHaveBeenLastCalledWith(result.current.history);
  });

  it('throws when used outside a RunsProvider', async () => {
    await expect(renderHook(() => useRuns())).rejects.toThrow(
      'useRuns must be used within a RunsProvider',
    );
  });
});
