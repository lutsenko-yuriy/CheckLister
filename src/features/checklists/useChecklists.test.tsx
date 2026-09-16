import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChecklistsProvider, useChecklists } from './useChecklists';
import { AsyncStorageChecklistRepository } from './data/asyncStorageChecklistRepository';
import { ChecklistRepository } from './domain/checklistRepository';
import { Checklist } from './domain/models';

function makeWrapper(repository: ChecklistRepository) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ChecklistsProvider repository={repository}>
        {children}
      </ChecklistsProvider>
    );
  };
}

function fakeRepository(
  overrides: Partial<ChecklistRepository> = {},
): ChecklistRepository {
  return {
    getAll: jest.fn().mockResolvedValue([]),
    saveAll: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('useChecklists', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('loads persisted checklists on mount', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([{ id: '1', title: 'Groceries', items: [] }]);

    const { result } = await renderHook(() => useChecklists(), {
      wrapper: makeWrapper(repo),
    });

    await waitFor(() => expect(result.current.checklists).toHaveLength(1));
    expect(result.current.checklists[0].title).toBe('Groceries');
  });

  it('creates a checklist and persists it', async () => {
    const repo = new AsyncStorageChecklistRepository();
    const { result } = await renderHook(() => useChecklists(), {
      wrapper: makeWrapper(repo),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.createChecklist('Packing');
    });

    await waitFor(() => expect(result.current.checklists).toHaveLength(1));
    expect(result.current.checklists[0].title).toBe('Packing');

    const persisted = await repo.getAll();
    expect(persisted).toHaveLength(1);
    expect(persisted[0].title).toBe('Packing');
  });

  it('renames a checklist and persists the change', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([{ id: '1', title: 'Old title', items: [] }]);
    const { result } = await renderHook(() => useChecklists(), {
      wrapper: makeWrapper(repo),
    });
    await waitFor(() => expect(result.current.checklists).toHaveLength(1));

    await act(async () => {
      result.current.renameChecklist('1', 'New title');
    });

    await waitFor(() =>
      expect(result.current.checklists[0].title).toBe('New title'),
    );
    const persisted = await repo.getAll();
    expect(persisted[0].title).toBe('New title');
  });

  it('deletes a checklist and persists the change', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([{ id: '1', title: 'Groceries', items: [] }]);
    const { result } = await renderHook(() => useChecklists(), {
      wrapper: makeWrapper(repo),
    });
    await waitFor(() => expect(result.current.checklists).toHaveLength(1));

    await act(async () => {
      result.current.deleteChecklist('1');
    });

    await waitFor(() => expect(result.current.checklists).toHaveLength(0));
    expect(await repo.getAll()).toHaveLength(0);
  });

  it('does not let a slow initial load clobber a checklist created before it resolves', async () => {
    let resolveGetAll: (checklists: Checklist[]) => void = () => {};
    const getAllPromise = new Promise<Checklist[]>(resolve => {
      resolveGetAll = resolve;
    });
    const repo = fakeRepository({
      getAll: jest.fn().mockReturnValue(getAllPromise),
    });

    const { result } = await renderHook(() => useChecklists(), {
      wrapper: makeWrapper(repo),
    });

    await act(async () => {
      result.current.createChecklist('Packing');
    });
    expect(result.current.checklists).toHaveLength(1);

    await act(async () => {
      resolveGetAll([]);
      await getAllPromise;
    });

    expect(result.current.checklists).toHaveLength(1);
    expect(result.current.checklists[0].title).toBe('Packing');
  });

  it('does not throw when persisting fails, and logs the error', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const repo = fakeRepository({
      saveAll: jest.fn().mockRejectedValue(new Error('disk full')),
    });

    const { result } = await renderHook(() => useChecklists(), {
      wrapper: makeWrapper(repo),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.createChecklist('Packing');
    });

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(result.current.checklists).toHaveLength(1);

    consoleError.mockRestore();
  });
});
