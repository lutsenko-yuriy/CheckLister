import { ConsentGatedAnalyticsService } from './ConsentGatedAnalyticsService';
import { FirebaseAnalyticsService } from './FirebaseAnalyticsService';

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null
>;

export interface AnalyticsService {
  logEvent(name: string, properties?: AnalyticsProperties): void;
  logScreenView(screenName: string, properties?: AnalyticsProperties): void;
}

/**
 * No-op implementation, kept as a test double. Every event/screen view must
 * be documented in docs/ANALYTICS_EVENTS.md before it's added.
 */
export class NoopAnalyticsService implements AnalyticsService {
  logEvent(_name: string, _properties?: AnalyticsProperties): void {}

  logScreenView(_screenName: string, _properties?: AnalyticsProperties): void {}
}

// Firebase-backed, and silent until the user allows analytics (CheL-126).
export const analyticsConsentGate = new ConsentGatedAnalyticsService(
  new FirebaseAnalyticsService(),
);

export const analytics: AnalyticsService = analyticsConsentGate;
