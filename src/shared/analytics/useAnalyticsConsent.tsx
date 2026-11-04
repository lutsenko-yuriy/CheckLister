import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { AnalyticsConsentChoice } from './analyticsConsent';
import type { AnalyticsConsentStore } from './analyticsConsentStore';
import type { AnalyticsConsentStatus } from './ConsentGatedAnalyticsService';

// The slice of ConsentGatedAnalyticsService the provider drives.
interface ConsentGate {
  setConsent(status: AnalyticsConsentStatus): void;
  logEvent(name: string): void;
}

interface AnalyticsConsentContextValue {
  status: AnalyticsConsentStatus;
  allow(): Promise<void>;
  deny(): Promise<void>;
  // Settings toggle (CheL-127): applies at once, saves in the background.
  setChoice(choice: AnalyticsConsentChoice): void;
}

const AnalyticsConsentContext =
  createContext<AnalyticsConsentContextValue | null>(null);

interface ProviderProps {
  store: AnalyticsConsentStore;
  gate: ConsentGate;
  children: React.ReactNode;
}

/**
 * Renders nothing until the stored choice has been read, so no child can log
 * an event before the gate knows the user's answer (CheL-126).
 */
export function AnalyticsConsentProvider({
  store,
  gate,
  children,
}: ProviderProps) {
  const [status, setStatus] = useState<AnalyticsConsentStatus | null>(null);
  const deciding = useRef(false);
  // Read by setChoice so back-to-back taps see each other before a re-render.
  const current = useRef<AnalyticsConsentStatus | null>(null);
  const saves = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    store
      .load()
      .catch((): AnalyticsConsentStatus => 'unknown')
      .then(loaded => {
        if (!cancelled) {
          gate.setConsent(loaded);
          current.current = loaded;
          setStatus(loaded);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [store, gate]);

  const decide = useCallback(
    async (choice: AnalyticsConsentChoice) => {
      if (deciding.current || status !== 'unknown') {
        return;
      }
      deciding.current = true;
      try {
        await store.save(choice);
      } catch {
        // Applies for this session only; the next launch asks again.
      }
      gate.setConsent(choice);
      if (choice === 'granted') {
        gate.logEvent('analytics_consent_granted');
      }
      current.current = choice;
      setStatus(choice);
    },
    [store, gate, status],
  );

  const setChoice = useCallback(
    (choice: AnalyticsConsentChoice) => {
      const previous = current.current;
      if (previous === null || previous === choice) {
        return;
      }
      current.current = choice;
      gate.setConsent(choice);
      setStatus(choice);
      // Chained so the last tap is the last write; a failed save leaves the
      // choice in force for this session only.
      saves.current = saves.current
        .then(() => store.save(choice))
        .catch(() => {})
        .then(() => {
          if (choice === 'granted') {
            gate.logEvent('analytics_consent_granted');
          }
        });
    },
    [store, gate],
  );

  const value = useMemo<AnalyticsConsentContextValue>(
    () => ({
      status: status ?? 'unknown',
      allow: () => decide('granted'),
      deny: () => decide('denied'),
      setChoice,
    }),
    [status, decide, setChoice],
  );

  if (status === null) {
    return null;
  }
  return (
    <AnalyticsConsentContext.Provider value={value}>
      {children}
    </AnalyticsConsentContext.Provider>
  );
}

export function useAnalyticsConsent(): AnalyticsConsentContextValue {
  const value = useContext(AnalyticsConsentContext);
  if (value === null) {
    throw new Error(
      'useAnalyticsConsent must be used within an AnalyticsConsentProvider',
    );
  }
  return value;
}
