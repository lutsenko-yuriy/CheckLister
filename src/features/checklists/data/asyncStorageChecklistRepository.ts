import {getJson, setJson} from '../../../shared/storage/jsonStorage';
import {ChecklistRepository} from '../domain/checklistRepository';
import {Checklist} from '../domain/models';

const STORAGE_KEY = 'checklists';

export class AsyncStorageChecklistRepository implements ChecklistRepository {
  async getAll(): Promise<Checklist[]> {
    return getJson<Checklist[]>(STORAGE_KEY, []);
  }

  async saveAll(checklists: Checklist[]): Promise<void> {
    await setJson(STORAGE_KEY, checklists);
  }
}
