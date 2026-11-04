import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import type {
  KillSwitchSource,
  RawSwitchValues,
} from './RemoteConfigKillSwitchSource';
import type {
  KillSwitchOverrides,
  KillSwitchOverrideStore,
} from './killSwitchOverrideStore';
import {
  KILL_SWITCHES,
  KillSwitchId,
  KillSwitchSourceKind,
  parseRemoteSwitch,
  resolveKillSwitch,
} from './killSwitches';

interface KillSwitchContextValue {
  appVersion: string;
  // null until the locally activated values have been read.
  values: RawSwitchValues | null;
  overrides: KillSwitchOverrides;
  setOverride(id: KillSwitchId, enabled: boolean): void;
  resetOverride(id: KillSwitchId): void;
  resetAll(): void;
}

export interface KillSwitchDebugEntry {
  id: KillSwitchId;
  label: string;
  enabled: boolean;
  source: KillSwitchSourceKind;
  override: boolean | null;
}

const KillSwitchContext = createContext<KillSwitchContextValue | null>(null);

interface ProviderProps {
  source: KillSwitchSource;
  // Debug builds only: without a store, overrides do not exist.
  overrideStore?: KillSwitchOverrideStore;
  appVersion: string;
  children: React.ReactNode;
}

/**
 * Never gates rendering. Switches read false until the local values are in,
 * then follow the remote config; a fetch that activates applies live.
 */
export function KillSwitchProvider({
  source,
  overrideStore,
  appVersion,
  children,
}: ProviderProps) {
  const [values, setValues] = useState<RawSwitchValues | null>(null);
  const [overrides, setOverrides] = useState<KillSwitchOverrides | null>(
    overrideStore ? null : {},
  );
  // Read by the setters so back-to-back taps see each other before a re-render.
  const currentOverrides = useRef<KillSwitchOverrides>({});
  const saves = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!overrideStore) {
      return;
    }
    let cancelled = false;
    overrideStore.load().then(loaded => {
      if (!cancelled) {
        currentOverrides.current = loaded;
        setOverrides(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [overrideStore]);

  const apply = useCallback(
    (next: KillSwitchOverrides) => {
      if (!overrideStore) {
        return;
      }
      currentOverrides.current = next;
      setOverrides(next);
      saves.current = saves.current
        .then(() => overrideStore.save(next))
        .catch(() => {});
    },
    [overrideStore],
  );
  const setOverride = useCallback(
    (id: KillSwitchId, enabled: boolean) =>
      apply({ ...currentOverrides.current, [id]: enabled }),
    [apply],
  );
  const resetOverride = useCallback(
    (id: KillSwitchId) => {
      const rest = { ...currentOverrides.current };
      delete rest[id];
      apply(rest);
    },
    [apply],
  );
  const resetAll = useCallback(() => apply({}), [apply]);

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

  const value = useMemo(
    () => ({
      appVersion,
      // Ready only once both reads settle: no flash from remote to override.
      values: overrides === null ? null : values,
      overrides: overrides ?? {},
      setOverride,
      resetOverride,
      resetAll,
    }),
    [appVersion, values, overrides, setOverride, resetOverride, resetAll],
  );
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
    override: ctx.overrides[id] ?? null,
  }).enabled;
}

/** Debug screen data. Without a provider every switch reads as the default. */
export function useKillSwitchDebug() {
  const ctx = useContext(KillSwitchContext);
  const switches = (Object.keys(KILL_SWITCHES) as KillSwitchId[]).map(
    (id): KillSwitchDebugEntry => {
      const raw = ctx?.values?.[id];
      const override = ctx?.overrides[id] ?? null;
      const { enabled, source } = resolveKillSwitch({
        appVersion: ctx?.appVersion ?? '0.0.0',
        remote: raw === undefined ? null : parseRemoteSwitch(raw),
        override,
      });
      return { id, label: KILL_SWITCHES[id].label, enabled, source, override };
    },
  );
  return {
    switches,
    setOverride: ctx?.setOverride ?? (() => {}),
    resetOverride: ctx?.resetOverride ?? (() => {}),
    resetAll: ctx?.resetAll ?? (() => {}),
  };
}
