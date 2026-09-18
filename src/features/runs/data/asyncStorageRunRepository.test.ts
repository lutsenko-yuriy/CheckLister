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
});
