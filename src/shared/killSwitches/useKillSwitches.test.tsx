import React from 'react';
import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import {
  KillSwitchSource,
  RawSwitchValues,
} from './RemoteConfigKillSwitchSource';
import { KillSwitchProvider, useKillSwitch } from './useKillSwitches';

const OFF = '{"enabled":false,"min_version":"0.16.0"}';

function makeSource(
  activated: RawSwitchValues,
  fetched: boolean | Promise<boolean> = false,
) {
  const state = { activated };
  const source: jest.Mocked<KillSwitchSource> = {
    loadActivated: jest.fn(() => Promise.resolve(state.activated)),
    fetchAndActivate: jest.fn(() => Promise.resolve(fetched)),
  };
  return { source, state };
}

async function render(source: KillSwitchSource, appVersion = '0.16.0') {
  return renderHook(() => useKillSwitch('runHistory'), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <KillSwitchProvider source={source} appVersion={appVersion}>
        {children}
      </KillSwitchProvider>
    ),
  });
}

const flush = () => act(async () => {});

describe('useKillSwitch', () => {
  let appStateHandler: (s: string) => void;
  const remove = jest.fn();

  beforeEach(() => {
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((
      _t: string,
      h: (s: string) => void,
    ) => {
      appStateHandler = h;
      return { remove };
    }) as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it('is on without a provider', async () => {
    const { result } = await renderHook(() => useKillSwitch('runHistory'));
    expect(result.current).toBe(true);
  });

  it('is off until the local values are read', async () => {
    let release!: (v: RawSwitchValues) => void;
    const { source } = makeSource({});
    source.loadActivated.mockReturnValue(
      new Promise<RawSwitchValues>(r => {
        release = r;
      }),
    );
    const { result } = await render(source);
    expect(result.current).toBe(false);
    release({});
    await flush();
    expect(result.current).toBe(true);
  });

  it('applies a cached off value on the first ready render', async () => {
    const { source } = makeSource({ runHistory: OFF });
    const { result } = await render(source);
    await flush();
    expect(result.current).toBe(false);
  });

  it('ignores a value whose min_version is newer than the app', async () => {
    const { source } = makeSource({ runHistory: OFF });
    const { result } = await render(source, '0.15.0');
    await flush();
    expect(result.current).toBe(true);
  });

  it('applies a fetched value live', async () => {
    const { source, state } = makeSource({}, true);
    source.fetchAndActivate.mockImplementation(() => {
      state.activated = { runHistory: OFF };
      return Promise.resolve(true);
    });
    const { result } = await render(source);
    await flush();
    expect(result.current).toBe(false);
  });

  it('keeps the cached value when the fetch fails', async () => {
    const { source } = makeSource({ runHistory: OFF }, false);
    const { result } = await render(source);
    await flush();
    expect(result.current).toBe(false);
    expect(source.loadActivated).toHaveBeenCalledTimes(1);
  });

  it('fetches again when the app becomes active', async () => {
    const { source } = makeSource({});
    await render(source);
    await flush();
    await act(async () => appStateHandler('active'));
    await flush();
    expect(source.fetchAndActivate).toHaveBeenCalledTimes(2);
    await act(async () => appStateHandler('background'));
    await flush();
    expect(source.fetchAndActivate).toHaveBeenCalledTimes(2);
  });

  it('dedupes a fetch that is already in flight', async () => {
    let resolve!: (v: boolean) => void;
    const pending = new Promise<boolean>(r => {
      resolve = r;
    });
    const { source } = makeSource({}, pending);
    await render(source);
    await flush();
    await act(async () => appStateHandler('active'));
    expect(source.fetchAndActivate).toHaveBeenCalledTimes(1);
    resolve(false);
    await flush();
  });

  it('is safe to unmount mid-fetch', async () => {
    let resolve!: (v: boolean) => void;
    const pending = new Promise<boolean>(r => {
      resolve = r;
    });
    const { source } = makeSource({}, pending);
    const { unmount } = await render(source);
    await flush();
    await unmount();
    expect(remove).toHaveBeenCalled();
    resolve(true);
    await flush();
  });
});
