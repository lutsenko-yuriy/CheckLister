import { getJson, setJson } from '../storage/jsonStorage';
import {
  parseStoredConsent,
  type AnalyticsConsentChoice,
  type StoredAnalyticsConsent,
} from './analyticsConsent';
import type { AnalyticsConsentStatus } from './ConsentGatedAnalyticsService';

const STORAGE_KEY = 'analyticsConsent';

export interface AnalyticsConsentStore {
  load(): Promise<AnalyticsConsentStatus>;
  save(choice: AnalyticsConsentChoice): Promise<void>;
}

export class AsyncStorageAnalyticsConsentStore
  implements AnalyticsConsentStore
{
  async load(): Promise<AnalyticsConsentStatus> {
    try {
      return parseStoredConsent(await getJson<unknown>(STORAGE_KEY, null));
    } catch {
      return 'unknown';
    }
  }

  async save(choice: AnalyticsConsentChoice): Promise<void> {
    const record: StoredAnalyticsConsent = {
      choice,
      decidedAt: new Date().toISOString(),
    };
    await setJson(STORAGE_KEY, record);
  }
}
