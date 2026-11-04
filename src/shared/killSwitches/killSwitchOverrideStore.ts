import { getJson, setJson } from '../storage/jsonStorage';
import { KILL_SWITCHES, KillSwitchId } from './killSwitches';

const STORAGE_KEY = 'killSwitchOverrides';

export type KillSwitchOverrides = Partial<Record<KillSwitchId, boolean>>;

export interface KillSwitchOverrideStore {
  load(): Promise<KillSwitchOverrides>;
  save(overrides: KillSwitchOverrides): Promise<void>;
}

/** Debug builds only (CheL-128): release never constructs this store. */
export class AsyncStorageKillSwitchOverrideStore
  implements KillSwitchOverrideStore
{
  async load(): Promise<KillSwitchOverrides> {
    let raw: unknown;
    try {
      raw = await getJson<unknown>(STORAGE_KEY, null);
    } catch {
      return {};
    }
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return {};
    }
    const stored = raw as Record<string, unknown>;
    const overrides: KillSwitchOverrides = {};
    for (const id of Object.keys(KILL_SWITCHES) as KillSwitchId[]) {
      if (typeof stored[id] === 'boolean') {
        overrides[id] = stored[id] as boolean;
      }
    }
    return overrides;
  }

  async save(overrides: KillSwitchOverrides): Promise<void> {
    await setJson(STORAGE_KEY, overrides);
  }
}
