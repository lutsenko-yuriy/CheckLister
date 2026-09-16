import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChecklistsProvider, useChecklists } from './useChecklists';
import { AsyncStorageChecklistRepository } from './data/asyncStorageChecklistRepository';

function wrapper({ children }: { children: React.ReactNode }) {
  return <ChecklistsProvider>{children}</ChecklistsProvider>;
}

describe('useChecklists', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('loads persisted checklists on mount', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([{ id: '1', title: 'Groceries', items: [] }]);

    const { result } = await renderHook(() => useChecklists(), { wrapper });

    await waitFor(() => expect(result.current.checklists).toHaveLength(1));
    expect(result.current.checklists[0].title).toBe('Groceries');
  });

  it('creates a checklist and persists it', async () => {
    const { result } = await renderHook(() => useChecklists(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.createChecklist('Packing');
    });

    await waitFor(() => expect(result.current.checklists).toHaveLength(1));
    expect(result.current.checklists[0].title).toBe('Packing');

    const persisted = await new AsyncStorageChecklistRepository().getAll();
    expect(persisted).toHaveLength(1);
    expect(persisted[0].title).toBe('Packing');
  });

  it('renames a checklist and persists the change', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([{ id: '1', title: 'Old title', items: [] }]);
    const { result } = await renderHook(() => useChecklists(), { wrapper });
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
    const { result } = await renderHook(() => useChecklists(), { wrapper });
    await waitFor(() => expect(result.current.checklists).toHaveLength(1));

    await act(async () => {
      result.current.deleteChecklist('1');
    });

    await waitFor(() => expect(result.current.checklists).toHaveLength(0));
    expect(await repo.getAll()).toHaveLength(0);
  });
});
