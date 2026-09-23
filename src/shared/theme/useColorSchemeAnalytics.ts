import { useEffect, useRef } from 'react';
import { analytics } from '../analytics/AnalyticsService';
import type { ColorScheme } from './useTheme';

// Called once from inside ThemeProvider with the already-resolved scheme —
// it has no OS listener of its own, so a background→foreground transition or
// a duplicate-delivered value collapses to whatever this ref last logged,
// with no separate handling needed for either case. In dev, Fast Refresh or
// StrictMode double-mounting the provider can log the same scheme twice;
// that is a known dev-only artifact, not something production sees.
export function useColorSchemeAnalytics(scheme: ColorScheme): void {
  const lastLoggedRef = useRef<ColorScheme | null>(null);

  useEffect(() => {
    if (lastLoggedRef.current === scheme) {
      return;
    }
    lastLoggedRef.current = scheme;
    analytics.logEvent('color_scheme_resolved', { color_scheme: scheme });
  }, [scheme]);
}
