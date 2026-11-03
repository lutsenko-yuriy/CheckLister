import type { AnalyticsProperties, AnalyticsService } from './AnalyticsService';

export type AnalyticsConsentStatus = 'unknown' | 'granted' | 'denied';

export interface CollectionAnalyticsService extends AnalyticsService {
  setCollectionEnabled(enabled: boolean): void;
}

/**
 * Forwards to the delegate only while the user has allowed analytics. Events
 * logged before that are dropped, never buffered or replayed (CheL-126).
 */
export class ConsentGatedAnalyticsService implements AnalyticsService {
  private status: AnalyticsConsentStatus = 'unknown';

  constructor(private readonly delegate: CollectionAnalyticsService) {}

  setConsent(status: AnalyticsConsentStatus): void {
    this.status = status;
    this.delegate.setCollectionEnabled(status === 'granted');
  }

  logEvent(name: string, properties?: AnalyticsProperties): void {
    if (this.status === 'granted') {
      this.delegate.logEvent(name, properties);
    }
  }

  logScreenView(screenName: string, properties?: AnalyticsProperties): void {
    if (this.status === 'granted') {
      this.delegate.logScreenView(screenName, properties);
    }
  }
}
