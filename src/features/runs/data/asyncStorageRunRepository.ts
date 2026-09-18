import { getJson, setJson } from '../../../shared/storage/jsonStorage';
import { RunHistoryEntry } from '../domain/models';
import { RunRepository } from '../domain/runRepository';

const STORAGE_KEY = 'runHistory';

function newestFirst(entries: RunHistoryEntry[]): RunHistoryEntry[] {
  return [...entries].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  );
}

export class AsyncStorageRunRepository implements RunRepository {
  async getAll(): Promise<RunHistoryEntry[]> {
    return newestFirst(
      await getJson<RunHistoryEntry[]>(STORAGE_KEY, []),
    );
  }

  async saveAll(entries: RunHistoryEntry[]): Promise<void> {
    await setJson(STORAGE_KEY, newestFirst(entries));
  }
}
