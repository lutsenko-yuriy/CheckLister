import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createChecklist, createItem } from '../checklists/domain/models';
import { AsyncStorageRunRepository } from './data/asyncStorageRunRepository';
import { RunHistoryEntry } from './domain/models';
import { RunRepository } from './domain/runRepository';
import { RunsProvider, useRuns } from './useRuns';
import {
  FakeAttachmentStore,
  FakePhotoPicker,
  makeFakeAttachmentStore,
  makeFakePhotoPicker,
} from './testing/photoFakes';

function makeWrapper(
  repository: RunRepository,
  store: FakeAttachmentStore = makeFakeAttachmentStore(),
  picker: FakePhotoPicker = makeFakePhotoPicker(),
) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <RunsProvider
        repository={repository}
        attachmentStore={store}
        photoPicker={picker}
      >
        {children}
      </RunsProvider>
    );
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

describe('useRuns photos', () => {
  const checklist = {
    ...createChecklist('Groceries'),
    items: [createItem('Milk'), createItem('Eggs')],
  };

  async function setup(
    options: {
      store?: FakeAttachmentStore;
      picker?: FakePhotoPicker;
      repository?: RunRepository;
    } = {},
  ) {
    const store = options.store ?? makeFakeAttachmentStore();
    const picker = options.picker ?? makeFakePhotoPicker();
    const repository = options.repository ?? new AsyncStorageRunRepository();
    const hook = await renderHook(() => useRuns(), {
      wrapper: makeWrapper(repository, store, picker),
    });
    await waitFor(() => expect(hook.result.current.historyLoading).toBe(false));
    return { ...hook, store, picker, repository };
  }

  afterEach(async () => {
    await AsyncStorage.clear();
  });

  describe('attachPhoto', () => {
    it('stores the picked photo on the item and reports attached', async () => {
      const { result, store, picker } = await setup();
      await act(async () => result.current.startRun(checklist));
      const run = result.current.activeRun!;

      let outcome;
      await act(async () => {
        outcome = await result.current.attachPhoto(
          { type: 'item', runItemId: run.items[0].id },
          'camera',
        );
      });

      expect(outcome).toEqual({ type: 'attached', target: 'item' });
      expect(picker.pick).toHaveBeenCalledWith('camera');
      expect(store.importPhoto).toHaveBeenCalledWith(
        run.id,
        'file:///cache/pick.jpg',
      );
      expect(result.current.activeRun?.items[0].photo?.id).toBe('att-1');
      expect(result.current.attachingPhoto).toBe(false);
    });

    it('adds a run-level photo', async () => {
      const { result } = await setup();
      await act(async () => result.current.startRun(checklist));

      let outcome;
      await act(async () => {
        outcome = await result.current.attachPhoto({ type: 'run' }, 'library');
      });

      expect(outcome).toEqual({ type: 'attached', target: 'run' });
      expect(result.current.activeRun?.photos).toHaveLength(1);
    });

    it.each(['cancelled', 'denied', 'unavailable', 'failed'] as const)(
      'relays a %s pick without touching storage or the run',
      async type => {
        const { result, store } = await setup({
          picker: makeFakePhotoPicker({ type }),
        });
        await act(async () => result.current.startRun(checklist));

        let outcome;
        await act(async () => {
          outcome = await result.current.attachPhoto(
            { type: 'run' },
            'library',
          );
        });

        expect(outcome).toEqual({ type });
        expect(store.importPhoto).not.toHaveBeenCalled();
        expect(result.current.activeRun?.photos).toEqual([]);
      },
    );

    it('reports failed when the store rejects', async () => {
      const store = makeFakeAttachmentStore();
      store.importPhoto.mockRejectedValueOnce(new Error('disk full'));
      const { result } = await setup({ store });
      await act(async () => result.current.startRun(checklist));

      let outcome;
      await act(async () => {
        outcome = await result.current.attachPhoto({ type: 'run' }, 'library');
      });

      expect(outcome).toEqual({ type: 'failed' });
      expect(result.current.activeRun?.photos).toEqual([]);
      expect(result.current.attachingPhoto).toBe(false);
    });

    it('reports stale without picking when there is no active run', async () => {
      const { result, picker } = await setup();

      let outcome;
      await act(async () => {
        outcome = await result.current.attachPhoto({ type: 'run' }, 'library');
      });

      expect(outcome).toEqual({ type: 'stale' });
      expect(picker.pick).not.toHaveBeenCalled();
    });

    it('reports stale for an item that already has a photo', async () => {
      const { result, store } = await setup();
      await act(async () => result.current.startRun(checklist));
      const itemId = result.current.activeRun!.items[0].id;
      await act(async () => {
        await result.current.attachPhoto(
          { type: 'item', runItemId: itemId },
          'library',
        );
      });
      store.importPhoto.mockClear();

      let outcome;
      await act(async () => {
        outcome = await result.current.attachPhoto(
          { type: 'item', runItemId: itemId },
          'library',
        );
      });

      expect(outcome).toEqual({ type: 'stale' });
      expect(store.importPhoto).not.toHaveBeenCalled();
    });

    it('turns a second call into stale while one is in flight', async () => {
      let release: (r: { type: 'picked'; uri: string }) => void = () => {};
      const picker = makeFakePhotoPicker();
      picker.pick.mockImplementationOnce(
        () => new Promise(resolve => (release = resolve)),
      );
      const { result } = await setup({ picker });
      await act(async () => result.current.startRun(checklist));

      let first!: Promise<unknown>;
      await act(async () => {
        first = result.current.attachPhoto({ type: 'run' }, 'library');
      });
      expect(result.current.attachingPhoto).toBe(true);

      let second;
      await act(async () => {
        second = await result.current.attachPhoto({ type: 'run' }, 'camera');
      });
      expect(second).toEqual({ type: 'stale' });

      await act(async () => {
        release({ type: 'picked', uri: 'file:///cache/a.jpg' });
        await first;
      });
      expect(result.current.activeRun?.photos).toHaveLength(1);
      expect(result.current.attachingPhoto).toBe(false);
    });

    it('drops the imported photo when the run was replaced during the pick', async () => {
      let release: (r: { type: 'picked'; uri: string }) => void = () => {};
      const picker = makeFakePhotoPicker();
      picker.pick.mockImplementationOnce(
        () => new Promise(resolve => (release = resolve)),
      );
      const { result, store } = await setup({ picker });
      await act(async () => result.current.startRun(checklist));
      const oldRunId = result.current.activeRun!.id;

      let pending!: Promise<unknown>;
      await act(async () => {
        pending = result.current.attachPhoto({ type: 'run' }, 'library');
      });
      await act(async () => result.current.startRun(checklist));
      const newRunId = result.current.activeRun!.id;

      let outcome;
      await act(async () => {
        release({ type: 'picked', uri: 'file:///cache/a.jpg' });
        outcome = await pending;
      });

      expect(newRunId).not.toBe(oldRunId);
      expect(outcome).toEqual({ type: 'stale' });
      expect(result.current.activeRun?.photos).toEqual([]);
      expect(store.folders.has(newRunId)).toBe(false);
    });

    it('removes the imported file when the run is completed before the import lands', async () => {
      const store = makeFakeAttachmentStore();
      let land: () => void = () => {};
      store.importPhoto.mockImplementationOnce(
        runId =>
          new Promise(resolve => {
            land = () =>
              resolve({
                id: 'late',
                kind: 'photo',
                path: `attachments/${runId}/late.jpg`,
                addedAt: '2026-11-07T10:00:00.000Z',
              });
          }),
      );
      const { result } = await setup({ store });
      await act(async () => result.current.startRun(checklist));

      let pending!: Promise<unknown>;
      await act(async () => {
        pending = result.current.attachPhoto({ type: 'run' }, 'library');
      });
      await act(async () => {
        result.current.activeRun!.items.forEach(i =>
          result.current.toggleItem(i.id),
        );
      });
      await act(async () => result.current.completeRun());

      let outcome;
      await act(async () => {
        land();
        outcome = await pending;
      });

      expect(outcome).toEqual({ type: 'stale' });
      expect(store.remove).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'late' }),
      );
      expect(result.current.history[0].photos).toEqual([]);
    });
  });

  describe('removePhoto', () => {
    it('removes an item photo from the run and the store', async () => {
      const { result, store } = await setup();
      await act(async () => result.current.startRun(checklist));
      const itemId = result.current.activeRun!.items[0].id;
      await act(async () => {
        await result.current.attachPhoto(
          { type: 'item', runItemId: itemId },
          'library',
        );
      });
      const attachment = result.current.activeRun!.items[0].photo!;

      await act(async () => result.current.removePhoto(attachment.id));

      expect(result.current.activeRun?.items[0].photo).toBeNull();
      expect(store.remove).toHaveBeenCalledWith(attachment);
    });

    it('removes a run photo', async () => {
      const { result, store } = await setup();
      await act(async () => result.current.startRun(checklist));
      await act(async () => {
        await result.current.attachPhoto({ type: 'run' }, 'library');
      });
      const attachment = result.current.activeRun!.photos[0];

      await act(async () => result.current.removePhoto(attachment.id));

      expect(result.current.activeRun?.photos).toEqual([]);
      expect(store.remove).toHaveBeenCalledWith(attachment);
    });

    it('keeps the file of a completed run, which history still references', async () => {
      const { result, store } = await setup();
      await act(async () => result.current.startRun(checklist));
      await act(async () => {
        await result.current.attachPhoto({ type: 'run' }, 'library');
      });
      const id = result.current.activeRun!.photos[0].id;
      await act(async () => {
        result.current.activeRun!.items.forEach(i =>
          result.current.toggleItem(i.id),
        );
      });
      await act(async () => result.current.completeRun());

      await act(async () => result.current.removePhoto(id));

      expect(store.remove).not.toHaveBeenCalled();
      expect(result.current.history[0].photos).toHaveLength(1);
    });

    it('ignores an unknown id', async () => {
      const { result, store } = await setup();
      await act(async () => result.current.startRun(checklist));

      await act(async () => result.current.removePhoto('nope'));

      expect(store.remove).not.toHaveBeenCalled();
    });

    it('still updates the run when the file cannot be deleted', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const store = makeFakeAttachmentStore();
      store.remove.mockRejectedValueOnce(new Error('busy'));
      const { result } = await setup({ store });
      await act(async () => result.current.startRun(checklist));
      await act(async () => {
        await result.current.attachPhoto({ type: 'run' }, 'library');
      });
      const id = result.current.activeRun!.photos[0].id;

      await act(async () => result.current.removePhoto(id));

      expect(result.current.activeRun?.photos).toEqual([]);
      errorSpy.mockRestore();
    });
  });

  describe('discarding and replacing runs', () => {
    it('clearRun removes the folder of an uncompleted run', async () => {
      const { result, store } = await setup();
      await act(async () => result.current.startRun(checklist));
      const runId = result.current.activeRun!.id;

      await act(async () => result.current.clearRun());

      expect(store.removeRun).toHaveBeenCalledWith(runId);
      expect(result.current.activeRun).toBeNull();
    });

    it('clearRun keeps the folder of a completed run', async () => {
      const { result, store } = await setup();
      await act(async () => result.current.startRun(checklist));
      await act(async () => {
        result.current.activeRun!.items.forEach(i =>
          result.current.toggleItem(i.id),
        );
      });
      await act(async () => result.current.completeRun());

      await act(async () => result.current.clearRun());

      expect(store.removeRun).not.toHaveBeenCalled();
    });

    it('clearRun without an active run does nothing', async () => {
      const { result, store } = await setup();

      await act(async () => result.current.clearRun());

      expect(store.removeRun).not.toHaveBeenCalled();
    });

    it('starting a run over an uncompleted one removes the old folder', async () => {
      const { result, store } = await setup();
      await act(async () => result.current.startRun(checklist));
      const oldId = result.current.activeRun!.id;

      await act(async () => result.current.startRun(checklist));

      expect(store.removeRun).toHaveBeenCalledWith(oldId);
    });

    it('starting an external run over an uncompleted one removes the old folder', async () => {
      const { result, store } = await setup();
      await act(async () => result.current.startRun(checklist));
      const oldId = result.current.activeRun!.id;

      await act(async () =>
        result.current.startExternalRun(checklist, 'other://done'),
      );

      expect(store.removeRun).toHaveBeenCalledWith(oldId);
    });

    it('starting a run over a completed one keeps its folder', async () => {
      const { result, store } = await setup();
      await act(async () => result.current.startRun(checklist));
      await act(async () => {
        result.current.activeRun!.items.forEach(i =>
          result.current.toggleItem(i.id),
        );
      });
      await act(async () => result.current.completeRun());

      await act(async () => result.current.startRun(checklist));

      expect(store.removeRun).not.toHaveBeenCalled();
    });

    it('still discards the run when the folder cannot be deleted', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const store = makeFakeAttachmentStore();
      store.removeRun.mockRejectedValueOnce(new Error('busy'));
      const { result } = await setup({ store });
      await act(async () => result.current.startRun(checklist));

      await act(async () => result.current.clearRun());

      expect(result.current.activeRun).toBeNull();
      errorSpy.mockRestore();
    });
  });

  describe('launch sweep', () => {
    const entry = (id: string): RunHistoryEntry => ({
      id,
      checklistId: '1',
      checklistTitle: 'Groceries',
      itemCount: 1,
      completedAt: '2026-09-17T08:00:00.000Z',
    });

    it('removes folders that belong to no history entry', async () => {
      const store = makeFakeAttachmentStore();
      store.folders.add('kept');
      store.folders.add('orphan');
      const repository = new AsyncStorageRunRepository();
      await repository.saveAll([entry('kept')]);

      await setup({ store, repository });

      await waitFor(() =>
        expect(store.removeRun).toHaveBeenCalledWith('orphan'),
      );
      expect(store.removeRun).not.toHaveBeenCalledWith('kept');
    });

    it('does not sweep when history failed to load', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const store = makeFakeAttachmentStore();
      store.folders.add('precious');
      const repository: RunRepository = {
        getAll: jest.fn().mockRejectedValue(new Error('corrupt')),
        saveAll: jest.fn(),
      };

      await setup({ store, repository });

      expect(store.listRunIds).not.toHaveBeenCalled();
      expect(store.removeRun).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('skips the run that became active while the sweep was listing', async () => {
      const store = makeFakeAttachmentStore();
      let listed: (ids: string[]) => void = () => {};
      store.listRunIds.mockImplementationOnce(
        () => new Promise(resolve => (listed = resolve)),
      );
      const { result } = await setup({ store });
      await act(async () => result.current.startRun(checklist));
      const activeId = result.current.activeRun!.id;

      await act(async () => {
        listed([activeId, 'orphan']);
      });

      await waitFor(() =>
        expect(store.removeRun).toHaveBeenCalledWith('orphan'),
      );
      expect(store.removeRun).not.toHaveBeenCalledWith(activeId);
    });

    it('survives a listing failure', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const store = makeFakeAttachmentStore();
      store.listRunIds.mockRejectedValueOnce(new Error('io'));

      const { result } = await setup({ store });

      await waitFor(() => expect(errorSpy).toHaveBeenCalled());
      expect(result.current.historyLoading).toBe(false);
      errorSpy.mockRestore();
    });
  });

  it('snapshots items and photos into the history entry on completion', async () => {
    const { result } = await setup();
    await act(async () => result.current.startRun(checklist));
    const itemId = result.current.activeRun!.items[0].id;
    await act(async () => {
      await result.current.attachPhoto(
        { type: 'item', runItemId: itemId },
        'library',
      );
      await result.current.attachPhoto({ type: 'run' }, 'camera');
    });
    await act(async () => {
      result.current.activeRun!.items.forEach(i =>
        result.current.toggleItem(i.id),
      );
    });

    await act(async () => result.current.completeRun());

    const saved = result.current.history[0];
    expect(saved.items?.[0].photo?.id).toBe('att-1');
    expect(saved.photos).toHaveLength(1);
  });
});
