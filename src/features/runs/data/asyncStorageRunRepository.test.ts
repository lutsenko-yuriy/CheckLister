import AsyncStorage from '@react-native-async-storage/async-storage';
import { RunHistoryEntry } from '../domain/models';
import { AsyncStorageRunRepository } from './asyncStorageRunRepository';

const older: RunHistoryEntry = {
  id: 'run-1',
  checklistId: 'checklist-1',
  checklistTitle: 'Groceries',
  itemCount: 7,
  completedAt: '2026-09-17T08:00:00.000Z',
};

const newer: RunHistoryEntry = {
  id: 'run-2',
  checklistId: 'checklist-1',
  checklistTitle: 'Groceries',
  itemCount: 8,
  completedAt: '2026-09-18T08:00:00.000Z',
};

describe('AsyncStorageRunRepository', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns an empty array when no history has been saved', async () => {
    expect(await new AsyncStorageRunRepository().getAll()).toEqual([]);
  });

  it('round-trips history and returns it newest-first', async () => {
    const repository = new AsyncStorageRunRepository();

    await repository.saveAll([older, newer]);

    expect(await repository.getAll()).toEqual([newer, older]);
  });

  it('persists across repository instances independently of checklists', async () => {
    await new AsyncStorageRunRepository().saveAll([older]);

    expect(await new AsyncStorageRunRepository().getAll()).toEqual([older]);
  });

  it('round-trips an entry with its items and photos', async () => {
    const photo = {
      id: 'att-1',
      kind: 'photo' as const,
      path: 'attachments/run-3/att-1.jpg',
      addedAt: '2026-09-19T08:00:00.000Z',
    };
    const withPhotos: RunHistoryEntry = {
      id: 'run-3',
      checklistId: 'checklist-1',
      checklistTitle: 'Groceries',
      itemCount: 1,
      completedAt: '2026-09-19T08:00:00.000Z',
      items: [{ id: 'i1', text: 'Milk', checked: true, photo }],
      photos: [photo],
    };
    const repository = new AsyncStorageRunRepository();

    await repository.saveAll([withPhotos]);

    expect(await repository.getAll()).toEqual([withPhotos]);
  });

  it('loads legacy entries without items or photos alongside new ones', async () => {
    const withPhotos: RunHistoryEntry = {
      ...newer,
      id: 'run-4',
      completedAt: '2026-09-20T08:00:00.000Z',
      items: [],
      photos: [],
    };
    const repository = new AsyncStorageRunRepository();

    await repository.saveAll([older, withPhotos]);

    const loaded = await repository.getAll();
    expect(loaded.map(entry => entry.id)).toEqual(['run-4', 'run-1']);
    expect(loaded[1].items).toBeUndefined();
    expect(loaded[1].photos).toBeUndefined();
  });
});
