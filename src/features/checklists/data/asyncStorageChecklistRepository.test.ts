import AsyncStorage from '@react-native-async-storage/async-storage';
import { createChecklist } from '../domain/models';
import { AsyncStorageChecklistRepository } from './asyncStorageChecklistRepository';

describe('AsyncStorageChecklistRepository', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns an empty array when nothing has been saved', async () => {
    const repo = new AsyncStorageChecklistRepository();
    expect(await repo.getAll()).toEqual([]);
  });

  it('round-trips checklists through saveAll and getAll', async () => {
    const repo = new AsyncStorageChecklistRepository();
    const checklists = [
      createChecklist('Groceries'),
      createChecklist('Packing'),
    ];

    await repo.saveAll(checklists);

    expect(await repo.getAll()).toEqual(checklists);
  });

  it('persists across repository instances', async () => {
    const checklist = createChecklist('Groceries');
    await new AsyncStorageChecklistRepository().saveAll([checklist]);

    const secondInstance = new AsyncStorageChecklistRepository();
    expect(await secondInstance.getAll()).toEqual([checklist]);
  });
});
