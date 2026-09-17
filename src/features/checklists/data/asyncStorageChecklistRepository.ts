import { getJson, setJson } from '../../../shared/storage/jsonStorage';
import { ChecklistRepository } from '../domain/checklistRepository';
import { Checklist, Item } from '../domain/models';

const STORAGE_KEY = 'checklists';

function migrateChecklist(stored: Checklist): Checklist {
  const items: Item[] = stored.items.map(item => {
    // Drop the legacy `checked` field: checklists (templates) no longer
    // carry checked state — see CheL-15.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
      checked: _checked,
      sectionId: _sectionId,
      ...rest
    } = item as Item & {
      checked?: boolean;
      sectionId?: string | null;
    };
    return rest;
  });
  return { ...stored, items };
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
