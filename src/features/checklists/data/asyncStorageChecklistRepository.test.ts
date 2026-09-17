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

  it('migrates legacy checklists saved before sections existed', async () => {
    await AsyncStorage.setItem(
      'checklists',
      JSON.stringify([
        {
          id: '1',
          title: 'Groceries',
          items: [{ id: 'a', text: 'Milk', checked: false }],
        },
      ]),
    );

    const repo = new AsyncStorageChecklistRepository();
    const [checklist] = await repo.getAll();

    expect(checklist.sections).toEqual([]);
    expect(checklist.items[0].sectionId).toBeNull();
  });

  it('normalizes item order to the canonical section order on read', async () => {
    await AsyncStorage.setItem(
      'checklists',
      JSON.stringify([
        {
          id: '1',
          title: 'Groceries',
          sections: [{ id: 's1', name: 'Produce' }],
          items: [
            { id: 'apple', text: 'Apple', checked: false, sectionId: 's1' },
            { id: 'milk', text: 'Milk', checked: false, sectionId: null },
          ],
        },
      ]),
    );

    const repo = new AsyncStorageChecklistRepository();
    const [checklist] = await repo.getAll();

    expect(checklist.items.map(i => i.id)).toEqual(['milk', 'apple']);
  });
});
