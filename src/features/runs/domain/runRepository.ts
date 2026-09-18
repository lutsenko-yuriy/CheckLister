import { RunHistoryEntry } from './models';

export interface RunRepository {
  getAll(): Promise<RunHistoryEntry[]>;
  saveAll(entries: RunHistoryEntry[]): Promise<void>;
}
