import {
  ensureInitialized,
  fetchAndActivate,
  getRemoteConfig,
  getValue,
} from '@react-native-firebase/remote-config';
import { RemoteConfigKillSwitchSource } from './RemoteConfigKillSwitchSource';

const mocked = <T extends (...a: never[]) => unknown>(fn: T) =>
  fn as unknown as jest.Mock;

describe('RemoteConfigKillSwitchSource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked(ensureInitialized).mockResolvedValue(undefined);
    mocked(fetchAndActivate).mockResolvedValue(false);
    mocked(getValue).mockReturnValue({ asString: () => '' });
  });

  it('applies the fetch interval', () => {
    const config = getRemoteConfig();
    const source = new RemoteConfigKillSwitchSource(3600000);
    expect(source).toBeDefined();
    expect(config.settings).toMatchObject({
      minimumFetchIntervalMillis: 3600000,
    });
  });

  it('reads every registry key from the activated values', async () => {
    mocked(getValue).mockReturnValue({ asString: () => '{"x":1}' });
    const source = new RemoteConfigKillSwitchSource(0);
    expect(await source.loadActivated()).toEqual({
      runHistory: '{"x":1}',
      photos: '{"x":1}',
    });
    expect(getValue).toHaveBeenCalledWith(
      expect.anything(),
      'kill_switch_run_history',
    );
    expect(getValue).toHaveBeenCalledWith(
      expect.anything(),
      'kill_switch_photos',
    );
  });

  it('resolves to {} when native init fails', async () => {
    mocked(ensureInitialized).mockRejectedValue(new Error('native'));
    expect(await new RemoteConfigKillSwitchSource(0).loadActivated()).toEqual(
      {},
    );
  });

  it('resolves to {} when a read throws', async () => {
    mocked(getValue).mockImplementation(() => {
      throw new Error('native');
    });
    expect(await new RemoteConfigKillSwitchSource(0).loadActivated()).toEqual(
      {},
    );
  });

  it('reports whether a fetch activated new values', async () => {
    mocked(fetchAndActivate).mockResolvedValue(true);
    expect(await new RemoteConfigKillSwitchSource(0).fetchAndActivate()).toBe(
      true,
    );
  });

  it('swallows fetch errors', async () => {
    mocked(fetchAndActivate).mockRejectedValue(new Error('offline'));
    expect(await new RemoteConfigKillSwitchSource(0).fetchAndActivate()).toBe(
      false,
    );
  });

  it('survives setup errors', () => {
    const config = getRemoteConfig();
    Object.defineProperty(config, 'settings', {
      configurable: true,
      set() {
        throw new Error('native');
      },
    });
    expect(() => new RemoteConfigKillSwitchSource(0)).not.toThrow();
    delete (config as { settings?: unknown }).settings;
  });
});
