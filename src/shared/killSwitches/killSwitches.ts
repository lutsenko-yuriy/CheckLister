export const KILL_SWITCHES = {
  runHistory: { remoteKey: 'kill_switch_run_history', label: 'Run history' },
  photos: { remoteKey: 'kill_switch_photos', label: 'Photos' },
} as const;

export type KillSwitchId = keyof typeof KILL_SWITCHES;

export type RawSwitchValues = Partial<Record<KillSwitchId, string>>;

export interface KillSwitchSource {
  /** Reads the locally activated values; never rejects. */
  loadActivated(): Promise<RawSwitchValues>;
  /** Resolves true when new values were activated; never rejects. */
  fetchAndActivate(): Promise<boolean>;
  /** Sources that push new values (scenario builds); returns the unsubscribe. */
  subscribe?(listener: () => void): () => void;
}

export interface RemoteSwitch {
  enabled: boolean;
  minVersion: string;
}

export type KillSwitchSourceKind =
  | 'override'
  | 'remote'
  | 'default'
  | 'ignored';

const VERSION = /^\d+\.\d+\.\d+$/;

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) {
      return pa[i] - pb[i];
    }
  }
  return 0;
}

/** A missing or malformed value means "no remote value": the feature stays on. */
export function parseRemoteSwitch(raw: string): RemoteSwitch | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const { enabled, min_version: minVersion } = parsed as Record<
    string,
    unknown
  >;
  if (
    typeof enabled !== 'boolean' ||
    typeof minVersion !== 'string' ||
    !VERSION.test(minVersion)
  ) {
    return null;
  }
  return { enabled, minVersion };
}

export function resolveKillSwitch({
  appVersion,
  remote,
  override,
}: {
  appVersion: string;
  remote: RemoteSwitch | null;
  override: boolean | null;
}): { enabled: boolean; source: KillSwitchSourceKind } {
  if (override !== null) {
    return { enabled: override, source: 'override' };
  }
  if (remote === null) {
    return { enabled: true, source: 'default' };
  }
  if (compareVersions(appVersion, remote.minVersion) < 0) {
    return { enabled: true, source: 'ignored' };
  }
  return { enabled: remote.enabled, source: 'remote' };
}
