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

  useEffect(() => {
    let cancelled = false;
    store
      .load()
      .catch((): AnalyticsConsentStatus => 'unknown')
      .then(loaded => {
        if (!cancelled) {
          gate.setConsent(loaded);
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
      setStatus(choice);
    },
    [store, gate, status],
  );

  const value = useMemo<AnalyticsConsentContextValue>(
    () => ({
      status: status ?? 'unknown',
      allow: () => decide('granted'),
      deny: () => decide('denied'),
    }),
    [status, decide],
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
