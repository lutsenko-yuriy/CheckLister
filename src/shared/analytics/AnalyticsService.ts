export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null
>;

export interface AnalyticsService {
  logEvent(name: string, properties?: AnalyticsProperties): void;
  logScreenView(screenName: string, properties?: AnalyticsProperties): void;
}

/**
 * No-op implementation. Swap for a real SDK-backed AnalyticsService once
 * events are actually needed — see docs/ANALYTICS_EVENTS.md for the catalogue
 * every event/screen view must be documented in before it's added here.
 */
export class NoopAnalyticsService implements AnalyticsService {
  logEvent(_name: string, _properties?: AnalyticsProperties): void {}

  logScreenView(_screenName: string, _properties?: AnalyticsProperties): void {}
}

export const analytics: AnalyticsService = new NoopAnalyticsService();
