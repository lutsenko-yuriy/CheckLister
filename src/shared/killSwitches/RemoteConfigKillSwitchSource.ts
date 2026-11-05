import {
  ensureInitialized,
  fetchAndActivate,
  getRemoteConfig,
  getValue,
} from '@react-native-firebase/remote-config';
import { KILL_SWITCHES, KillSwitchId } from './killSwitches';

export type RawSwitchValues = Partial<Record<KillSwitchId, string>>;

export interface KillSwitchSource {
  /** Reads the locally activated values; never rejects. */
  loadActivated(): Promise<RawSwitchValues>;
  /** Resolves true when new values were activated; never rejects. */
  fetchAndActivate(): Promise<boolean>;
  /** Sources that push new values (scenario builds); returns the unsubscribe. */
  subscribe?(listener: () => void): () => void;
}

const ids = Object.keys(KILL_SWITCHES) as KillSwitchId[];

export class RemoteConfigKillSwitchSource implements KillSwitchSource {
  private readonly config = getRemoteConfig();

  constructor(minimumFetchIntervalMillis: number) {
    try {
      this.config.settings = {
        minimumFetchIntervalMillis,
        fetchTimeoutMillis: 60000,
      };
    } catch {
      // Fail open: the switches stay on.
    }
  }

  async loadActivated(): Promise<RawSwitchValues> {
    try {
      await ensureInitialized(this.config);
      const values: RawSwitchValues = {};
      ids.forEach(id => {
        values[id] = getValue(
          this.config,
          KILL_SWITCHES[id].remoteKey,
        ).asString();
      });
      return values;
    } catch {
      return {};
    }
  }

  async fetchAndActivate(): Promise<boolean> {
    try {
      return await fetchAndActivate(this.config);
    } catch {
      return false;
    }
  }
}
