import { getJson, setJson } from '../../../shared/storage/jsonStorage';
import { ChecklistRepository } from '../domain/checklistRepository';
import { Checklist, Item, normalizeChecklist } from '../domain/models';

const STORAGE_KEY = 'checklists';

function migrateChecklist(stored: Checklist): Checklist {
  const items: Item[] = stored.items.map(item => ({
    ...item,
    sectionId: item.sectionId ?? null,
  }));
  return normalizeChecklist({
    ...stored,
    sections: stored.sections ?? [],
    items,
  });
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
