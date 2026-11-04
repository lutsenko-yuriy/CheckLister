import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import type {
  KillSwitchSource,
  RawSwitchValues,
} from './RemoteConfigKillSwitchSource';
import {
  KillSwitchId,
  parseRemoteSwitch,
  resolveKillSwitch,
} from './killSwitches';

interface KillSwitchContextValue {
  appVersion: string;
  // null until the locally activated values have been read.
  values: RawSwitchValues | null;
}

const KillSwitchContext = createContext<KillSwitchContextValue | null>(null);

interface ProviderProps {
  source: KillSwitchSource;
  appVersion: string;
  children: React.ReactNode;
}

/**
 * Never gates rendering. Switches read false until the local values are in,
 * then follow the remote config; a fetch that activates applies live.
 */
export function KillSwitchProvider({
  source,
  appVersion,
  children,
}: ProviderProps) {
  const [values, setValues] = useState<RawSwitchValues | null>(null);

  useEffect(() => {
    let cancelled = false;
    let inFlight: Promise<void> | null = null;

    const refresh = () => {
      if (inFlight === null) {
        inFlight = source
          .fetchAndActivate()
          .then(async activated => {
            if (activated) {
              const loaded = await source.loadActivated();
              if (!cancelled) {
                setValues(loaded);
              }
            }
          })
          .catch(() => {})
          .then(() => {
            inFlight = null;
          });
      }
    };

    source.loadActivated().then(loaded => {
      if (!cancelled) {
        setValues(loaded);
      }
      refresh();
    });
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refresh();
      }
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [source]);

  const value = useMemo(() => ({ appVersion, values }), [appVersion, values]);
  return (
    <KillSwitchContext.Provider value={value}>
      {children}
    </KillSwitchContext.Provider>
  );
}

/** True when the feature is on. Without a provider (tests) everything is on. */
export function useKillSwitch(id: KillSwitchId): boolean {
  const ctx = useContext(KillSwitchContext);
  if (ctx === null) {
    return true;
  }
  if (ctx.values === null) {
    return false;
  }
  const raw = ctx.values[id];
  return resolveKillSwitch({
    appVersion: ctx.appVersion,
    remote: raw === undefined ? null : parseRemoteSwitch(raw),
    override: null,
  }).enabled;
}
