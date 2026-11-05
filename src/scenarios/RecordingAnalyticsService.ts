import type { AnalyticsProperties } from '../shared/analytics/AnalyticsService';
import type { CollectionAnalyticsService } from '../shared/analytics/ConsentGatedAnalyticsService';

export interface AnalyticsRecord {
  readonly kind: 'event' | 'screen' | 'collection';
  readonly name: string;
  readonly properties: AnalyticsProperties;
}

type Listener = () => void;

// Scenario builds only (CheL-147): replaces Firebase behind the consent gate, so flows
// assert on what would have been sent. In memory, lost on every launch.
export class RecordingAnalyticsService implements CollectionAnalyticsService {
  private records: readonly AnalyticsRecord[] = [];
  private collectionEnabled = false;
  private readonly listeners = new Set<Listener>();

  logEvent(name: string, properties: AnalyticsProperties = {}): void {
    this.add({ kind: 'event', name, properties });
  }

  logScreenView(
    screenName: string,
    properties: AnalyticsProperties = {},
  ): void {
    this.add({ kind: 'screen', name: screenName, properties });
  }

  // Only a change is recorded: the gate repeats the stored choice at every launch.
  setCollectionEnabled(enabled: boolean): void {
    if (enabled === this.collectionEnabled) {
      return;
    }
    this.collectionEnabled = enabled;
    this.add({
      kind: 'collection',
      name: enabled ? 'collection_on' : 'collection_off',
      properties: {},
    });
  }

  getRecords(): readonly AnalyticsRecord[] {
    return this.records;
  }

  clear(): void {
    this.records = [];
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private add(record: AnalyticsRecord): void {
    this.records = [...this.records, record];
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }
}

export const recordingAnalyticsService = new RecordingAnalyticsService();
