import { Checklist } from './models';

export interface ChecklistRepository {
  getAll(): Promise<Checklist[]>;
  saveAll(checklists: Checklist[]): Promise<void>;
}
