import { useEffect } from 'react';
import { isSameResolution, type LanguageResolution } from './resolveLanguage';

export type AnalyticsProperties = Readonly<
  Record<string, string | number | boolean | null>
>;

/** Host-supplied analytics sink — keeps this package free of any app import. */
export type LanguageAnalyticsSink = (
  event: string,
  properties: AnalyticsProperties,
) => void;

// Module-level rather than a useRef (cf. useColorSchemeAnalytics): an Android
// activity recreation or any other React root remount keeps the same JS
// module instance, so the same tuple is not re-logged within one session.
// Only a fresh JS context — a genuinely new session, e.g. the process iOS
// relaunches after a per-app language change — starts from null again. This
// also absorbs dev-only StrictMode / Fast Refresh double mounts.
let lastLogged: LanguageResolution | null = null;

function toProperties(resolution: LanguageResolution): AnalyticsProperties {
  const properties: Record<string, string> = {
    app_language: resolution.appLanguage,
    requested_language: resolution.requestedLanguage,
  };
  // Omitted rather than null/'' when the OS reports no region, per
  // docs/ANALYTICS_EVENTS.md.
  if (resolution.region !== undefined) {
    properties.region = resolution.region;
  }
  return properties;
}

/**
 * Emits `app_language_resolved` whenever the full
 * (app_language, requested_language, region) tuple differs from the last one
 * logged in this JS session. Called from inside I18nProvider with the
 * already-resolved language; it has no OS listener of its own. `onResolved`
 * is the host app's analytics sink (e.g. `analytics.logEvent`) — this
 * package has no analytics dependency of its own.
 */
export function useLanguageAnalytics(
  resolution: LanguageResolution,
  onResolved?: LanguageAnalyticsSink,
): void {
  useEffect(() => {
    if (lastLogged !== null && isSameResolution(lastLogged, resolution)) {
      return;
    }
    lastLogged = resolution;
    onResolved?.('app_language_resolved', toProperties(resolution));
  }, [resolution, onResolved]);
}

/** Simulates a fresh JS session; module state otherwise leaks across tests. */
export function resetLanguageAnalyticsForTesting(): void {
  lastLogged = null;
}
