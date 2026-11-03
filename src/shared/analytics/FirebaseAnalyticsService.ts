import {
  getAnalytics,
  logEvent,
  setAnalyticsCollectionEnabled,
  setConsent,
} from '@react-native-firebase/analytics';
import type { AnalyticsProperties } from './AnalyticsService';
import type { CollectionAnalyticsService } from './ConsentGatedAnalyticsService';

// Firebase accepts only string and number parameter values.
function toFirebaseParams(
  properties: AnalyticsProperties = {},
): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value === null) {
      continue;
    }
    params[key] = typeof value === 'boolean' ? String(value) : value;
  }
  return params;
}

// Analytics is best-effort: a native failure must never reach the UI.
function bestEffort(call: () => Promise<void> | void): void {
  try {
    Promise.resolve(call()).catch(() => {});
  } catch {}
}

export class FirebaseAnalyticsService implements CollectionAnalyticsService {
  logEvent(name: string, properties?: AnalyticsProperties): void {
    bestEffort(() =>
      logEvent(getAnalytics(), name, toFirebaseParams(properties)),
    );
  }

  logScreenView(screenName: string, properties?: AnalyticsProperties): void {
    // RNFB's logScreenView is deprecated; screen_view is the underlying event.
    this.logEvent('screen_view', {
      ...properties,
      screen_name: screenName,
      screen_class: screenName,
    });
  }

  setCollectionEnabled(enabled: boolean): void {
    bestEffort(() => setAnalyticsCollectionEnabled(getAnalytics(), enabled));
    // Advertising storage stays off whatever the user chose.
    bestEffort(() =>
      setConsent(getAnalytics(), {
        analytics_storage: enabled,
        ad_storage: false,
        ad_user_data: false,
        ad_personalization: false,
      }),
    );
  }
}
