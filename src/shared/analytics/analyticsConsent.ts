import type { AnalyticsConsentStatus } from './ConsentGatedAnalyticsService';

export type AnalyticsConsentChoice = Exclude<AnalyticsConsentStatus, 'unknown'>;

// `decidedAt` is a consent record, and what CheL-127 will show in Settings.
export interface StoredAnalyticsConsent {
  choice: AnalyticsConsentChoice;
  decidedAt: string;
}

// Anything malformed or missing means "not decided": the safe direction is to ask again.
export function parseStoredConsent(value: unknown): AnalyticsConsentStatus {
  if (typeof value !== 'object' || value === null) {
    return 'unknown';
  }
  const { choice, decidedAt } = value as Record<string, unknown>;
  if (
    (choice === 'granted' || choice === 'denied') &&
    typeof decidedAt === 'string'
  ) {
    return choice;
  }
  return 'unknown';
}
