import { getJson, setJson } from '../../../shared/storage/jsonStorage';
import { ChecklistRepository } from '../domain/checklistRepository';
import { Checklist, Item } from '../domain/models';

const STORAGE_KEY = 'checklists';

function migrateChecklist(stored: Checklist): Checklist {
  const items: Item[] = stored.items.map(item => {
    // Drop legacy fields no longer part of the Item shape: `checked`
    // (checklists stopped carrying checked state, see CheL-15) and
    // `sectionId` (sections were removed entirely, see CheL-20).
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      checked: _checked,
      sectionId: _sectionId,
      ...rest
    } = item as Item & {
      checked?: boolean;
      sectionId?: string | null;
    };
    /* eslint-enable @typescript-eslint/no-unused-vars */
    return rest;
  });
  // Rebuild explicitly (rather than `{ ...stored, items }`) so a stray
  // `sections` field from a pre-CheL-20 stored checklist does not ride
  // along indefinitely.
  return { id: stored.id, title: stored.title, items };
}

export class AsyncStorageChecklistRepository implements ChecklistRepository {
  async getAll(): Promise<Checklist[]> {
    const stored = await getJson<Checklist[]>(STORAGE_KEY, []);
    return stored.map(migrateChecklist);
  }

  async saveAll(checklists: Checklist[]): Promise<void> {
    await setJson(STORAGE_KEY, checklists);
  }
}
