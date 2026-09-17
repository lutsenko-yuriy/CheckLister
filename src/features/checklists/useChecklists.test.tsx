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
    await repo.saveAll([
      { id: '1', title: 'Groceries', items: [], sections: [] },
    ]);

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
    await repo.saveAll([
      { id: '1', title: 'Old title', items: [], sections: [] },
    ]);
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
    await repo.saveAll([
      { id: '1', title: 'Groceries', items: [], sections: [] },
    ]);
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

  it('adds an item to a checklist and persists it', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      { id: '1', title: 'Groceries', items: [], sections: [] },
    ]);
    const { result } = await renderHook(() => useChecklists(), {
      wrapper: makeWrapper(repo),
    });
    await waitFor(() => expect(result.current.checklists).toHaveLength(1));

    await act(async () => {
      result.current.addItem('1', 'Milk');
    });

    await waitFor(() =>
      expect(result.current.checklists[0].items).toHaveLength(1),
    );
    expect(result.current.checklists[0].items[0]).toMatchObject({
      text: 'Milk',
    });
    const persisted = await repo.getAll();
    expect(persisted[0].items[0]).toMatchObject({
      text: 'Milk',
    });
  });

  it("edits an item's text and persists it", async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [{ id: 'a', text: 'Milk', sectionId: null }],
        sections: [],
      },
    ]);
    const { result } = await renderHook(() => useChecklists(), {
      wrapper: makeWrapper(repo),
    });
    await waitFor(() => expect(result.current.checklists).toHaveLength(1));

    await act(async () => {
      result.current.editItem('1', 'a', 'Oat milk');
    });

    await waitFor(() =>
      expect(result.current.checklists[0].items[0].text).toBe('Oat milk'),
    );
    expect((await repo.getAll())[0].items[0].text).toBe('Oat milk');
  });

  it('deletes an item and persists it', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [
          { id: 'a', text: 'Milk', sectionId: null },
          { id: 'b', text: 'Eggs', sectionId: null },
        ],
        sections: [],
      },
    ]);
    const { result } = await renderHook(() => useChecklists(), {
      wrapper: makeWrapper(repo),
    });
    await waitFor(() => expect(result.current.checklists).toHaveLength(1));

    await act(async () => {
      result.current.deleteItem('1', 'a');
    });

    await waitFor(() =>
      expect(result.current.checklists[0].items).toHaveLength(1),
    );
    expect(result.current.checklists[0].items[0].id).toBe('b');
    expect((await repo.getAll())[0].items).toHaveLength(1);
  });

  it('adds an item to a given section', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [],
        sections: [{ id: 's1', name: 'Produce' }],
      },
    ]);
    const { result } = await renderHook(() => useChecklists(), {
      wrapper: makeWrapper(repo),
    });
    await waitFor(() => expect(result.current.checklists).toHaveLength(1));

    await act(async () => {
      result.current.addItem('1', 'Apple', 's1');
    });

    await waitFor(() =>
      expect(result.current.checklists[0].items).toHaveLength(1),
    );
    expect(result.current.checklists[0].items[0]).toMatchObject({
      text: 'Apple',
      sectionId: 's1',
    });
  });

  it('adds a section and persists it', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      { id: '1', title: 'Groceries', items: [], sections: [] },
    ]);
    const { result } = await renderHook(() => useChecklists(), {
      wrapper: makeWrapper(repo),
    });
    await waitFor(() => expect(result.current.checklists).toHaveLength(1));

    await act(async () => {
      result.current.addSection('1', 'Produce');
    });

    await waitFor(() =>
      expect(result.current.checklists[0].sections).toHaveLength(1),
    );
    expect(result.current.checklists[0].sections[0].name).toBe('Produce');
    const persisted = await repo.getAll();
    expect(persisted[0].sections[0].name).toBe('Produce');
  });

  it('deletes a section and falls its items back to the default section', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        sections: [{ id: 's1', name: 'Produce' }],
        items: [{ id: 'a', text: 'Apple', sectionId: 's1' }],
      },
    ]);
    const { result } = await renderHook(() => useChecklists(), {
      wrapper: makeWrapper(repo),
    });
    await waitFor(() => expect(result.current.checklists).toHaveLength(1));

    await act(async () => {
      result.current.deleteSection('1', 's1');
    });

    await waitFor(() =>
      expect(result.current.checklists[0].sections).toHaveLength(0),
    );
    expect(result.current.checklists[0].items[0].sectionId).toBeNull();
    const persisted = await repo.getAll();
    expect(persisted[0].sections).toHaveLength(0);
    expect(persisted[0].items[0].sectionId).toBeNull();
  });

  it('moves an item within a checklist and persists the new order', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        sections: [],
        items: [
          { id: 'a', text: 'A', sectionId: null },
          { id: 'b', text: 'B', sectionId: null },
        ],
      },
    ]);
    const { result } = await renderHook(() => useChecklists(), {
      wrapper: makeWrapper(repo),
    });
    await waitFor(() => expect(result.current.checklists).toHaveLength(1));

    await act(async () => {
      result.current.moveItem('1', 'a', null, 1);
    });

    await waitFor(() =>
      expect(result.current.checklists[0].items.map(i => i.id)).toEqual([
        'b',
        'a',
      ]),
    );
    const persisted = await repo.getAll();
    expect(persisted[0].items.map(i => i.id)).toEqual(['b', 'a']);
  });

  it('moves a section within a checklist and persists the new order', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        sections: [
          { id: 's1', name: 'Produce' },
          { id: 's2', name: 'Dairy' },
        ],
        items: [
          { id: 'a', text: 'Apple', sectionId: 's1' },
          { id: 'm', text: 'Milk', sectionId: 's2' },
        ],
      },
    ]);
    const { result } = await renderHook(() => useChecklists(), {
      wrapper: makeWrapper(repo),
    });
    await waitFor(() => expect(result.current.checklists).toHaveLength(1));

    await act(async () => {
      result.current.moveSection('1', 's2', 0);
    });

    await waitFor(() =>
      expect(result.current.checklists[0].sections.map(s => s.id)).toEqual([
        's2',
        's1',
      ]),
    );
    const persisted = await repo.getAll();
    expect(persisted[0].sections.map(s => s.id)).toEqual(['s2', 's1']);
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
