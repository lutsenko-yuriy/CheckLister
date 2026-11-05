import React from 'react';
import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { KillSwitchSource, RawSwitchValues } from './killSwitches';
import {
  KillSwitchProvider,
  useKillSwitch,
  useKillSwitchDebug,
} from './useKillSwitches';
import type {
  KillSwitchOverrides,
  KillSwitchOverrideStore,
} from './killSwitchOverrideStore';

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

  describe('with a pushing source (scenario builds)', () => {
    function makePushSource(initial: RawSwitchValues = {}) {
      const state = { activated: initial };
      let push: () => void = () => {};
      const unsubscribe = jest.fn();
      const { source } = makeSource(initial);
      source.loadActivated.mockImplementation(() =>
        Promise.resolve(state.activated),
      );
      const pushing = {
        ...source,
        subscribe: jest.fn((listener: () => void) => {
          push = listener;
          return unsubscribe;
        }),
      };
      return { source: pushing, state, unsubscribe, push: () => push() };
    }

    it('applies a pushed value live', async () => {
      const { source, state, push } = makePushSource();
      const { result } = await render(source);
      await flush();
      expect(result.current).toBe(true);
      state.activated = { runHistory: OFF };
      await act(async () => push());
      expect(result.current).toBe(false);
    });

    it('lets the last of two overlapping pushes win', async () => {
      const { source, state, push } = makePushSource();
      const { result } = await render(source);
      await flush();
      const releases: ((v: RawSwitchValues) => void)[] = [];
      source.loadActivated.mockImplementation(
        () => new Promise<RawSwitchValues>(r => releases.push(r)),
      );
      state.activated = { runHistory: OFF };
      await act(async () => {
        push();
        push();
      });
      await act(async () => {
        releases[1]({});
        releases[0]({ runHistory: OFF });
      });
      expect(result.current).toBe(true);
    });

    it('lets a push beat a slower initial read', async () => {
      const { source, push } = makePushSource();
      const releases: ((v: RawSwitchValues) => void)[] = [];
      source.loadActivated.mockImplementation(
        () => new Promise<RawSwitchValues>(r => releases.push(r)),
      );
      const { result } = await render(source);
      await act(async () => push());
      await act(async () => {
        releases[1]({ runHistory: OFF });
        releases[0]({});
      });
      expect(result.current).toBe(false);
    });

    it('unsubscribes on unmount', async () => {
      const { source, unsubscribe } = makePushSource();
      const { unmount } = await render(source);
      await flush();
      await unmount();
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('keeps the pushed value when the app becomes active', async () => {
      const { source, state, push } = makePushSource();
      const { result } = await render(source);
      await flush();
      state.activated = { runHistory: OFF };
      await act(async () => push());
      await act(async () => appStateHandler('active'));
      await flush();
      expect(result.current).toBe(false);
    });
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

describe('kill-switch overrides (debug)', () => {
  function makeStore(
    stored: Awaited<ReturnType<KillSwitchOverrideStore['load']>> = {},
  ) {
    const store: jest.Mocked<KillSwitchOverrideStore> = {
      load: jest.fn(() => Promise.resolve(stored)),
      save: jest.fn((_o: KillSwitchOverrides) => Promise.resolve()),
    };
    return store;
  }

  async function renderDebug(
    source: KillSwitchSource,
    overrideStore?: KillSwitchOverrideStore,
  ) {
    const utils = await renderHook(
      () => ({ on: useKillSwitch('runHistory'), debug: useKillSwitchDebug() }),
      {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <KillSwitchProvider
            source={source}
            overrideStore={overrideStore}
            appVersion="0.16.0"
          >
            {children}
          </KillSwitchProvider>
        ),
      },
    );
    await flush();
    return utils;
  }

  beforeEach(() => {
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((() => ({ remove: jest.fn() })) as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it('lists every registry switch with its source', async () => {
    const { source } = makeSource({ runHistory: OFF });
    const { result } = await renderDebug(source, makeStore());
    expect(result.current.debug.switches).toEqual([
      {
        id: 'runHistory',
        label: 'Run history',
        enabled: false,
        source: 'remote',
        override: null,
      },
    ]);
  });

  it('lets an override beat the remote value', async () => {
    const { source } = makeSource({ runHistory: OFF });
    const { result } = await renderDebug(
      source,
      makeStore({ runHistory: true }),
    );
    expect(result.current.on).toBe(true);
    expect(result.current.debug.switches[0]).toMatchObject({
      source: 'override',
      override: true,
    });
  });

  it('sets, resets one and resets all overrides', async () => {
    const { source } = makeSource({ runHistory: OFF });
    const store = makeStore();
    const { result } = await renderDebug(source, store);

    await act(async () => result.current.debug.setOverride('runHistory', true));
    expect(result.current.on).toBe(true);
    expect(store.save).toHaveBeenLastCalledWith({ runHistory: true });

    await act(async () => result.current.debug.resetOverride('runHistory'));
    expect(result.current.on).toBe(false);
    expect(store.save).toHaveBeenLastCalledWith({});

    await act(async () => result.current.debug.setOverride('runHistory', true));
    await act(async () => result.current.debug.resetAll());
    expect(result.current.on).toBe(false);
    expect(store.save).toHaveBeenLastCalledWith({});
  });

  it('persists overrides: a new provider reads them back', async () => {
    const { source } = makeSource({});
    const store = makeStore();
    const first = await renderDebug(source, store);
    await act(async () =>
      first.result.current.debug.setOverride('runHistory', false),
    );
    await first.unmount();

    const saved = store.save.mock.calls[store.save.mock.calls.length - 1][0];
    const second = await renderDebug(source, makeStore(saved));
    expect(second.result.current.on).toBe(false);
  });

  it('saves in tap order: the last tap wins', async () => {
    const { source } = makeSource({});
    const store = makeStore();
    const { result } = await renderDebug(source, store);
    await act(async () => {
      result.current.debug.setOverride('runHistory', false);
      result.current.debug.setOverride('runHistory', true);
    });
    expect(result.current.on).toBe(true);
    expect(store.save.mock.calls.map(c => c[0])).toEqual([
      { runHistory: false },
      { runHistory: true },
    ]);
  });

  it('keeps the in-memory override when saving fails', async () => {
    const { source } = makeSource({});
    const store = makeStore();
    store.save.mockRejectedValue(new Error('io'));
    const { result } = await renderDebug(source, store);
    await act(async () =>
      result.current.debug.setOverride('runHistory', false),
    );
    expect(result.current.on).toBe(false);
  });

  it('stays off until both the overrides and the remote values are read', async () => {
    const { source } = makeSource({ runHistory: OFF });
    let release!: (v: Record<string, boolean>) => void;
    const store = makeStore();
    store.load.mockReturnValue(
      new Promise<Record<string, boolean>>(r => {
        release = r;
      }),
    );
    const { result } = await renderDebug(source, store);
    expect(result.current.on).toBe(false);
    expect(result.current.debug.switches[0].source).not.toBe('override');
    release({ runHistory: true });
    await flush();
    expect(result.current.on).toBe(true);
  });

  it('fails open when the override store rejects', async () => {
    const { source } = makeSource({});
    const store = makeStore();
    store.load.mockRejectedValue(new Error('io'));
    const { result } = await renderDebug(source, store);
    expect(result.current.on).toBe(true);
  });

  it('ignores overrides when no store is passed (release)', async () => {
    const { source } = makeSource({ runHistory: OFF });
    const { result } = await renderDebug(source);
    await act(async () => result.current.debug.setOverride('runHistory', true));
    expect(result.current.on).toBe(false);
    expect(result.current.debug.switches[0].source).toBe('remote');
  });
});
