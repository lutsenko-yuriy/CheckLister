import React, { useEffect } from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {
  AnalyticsConsentProvider,
  useAnalyticsConsent,
} from './useAnalyticsConsent';
import type { AnalyticsConsentStore } from './analyticsConsentStore';
import type { AnalyticsConsentStatus } from './ConsentGatedAnalyticsService';

function setup(
  stored: AnalyticsConsentStatus | 'throws' = 'unknown',
  overrides: Partial<AnalyticsConsentStore> = {},
) {
  const calls: string[] = [];
  const store: AnalyticsConsentStore = {
    load: jest.fn(async () => {
      if (stored === 'throws') {
        throw new Error('io');
      }
      return stored;
    }),
    save: jest.fn(async choice => {
      calls.push(`save:${choice}`);
    }),
    ...overrides,
  };
  const gate = {
    setConsent: jest.fn((status: AnalyticsConsentStatus) => {
      calls.push(`gate:${status}`);
    }),
    logEvent: jest.fn((name: string) => {
      calls.push(`event:${name}`);
    }),
  };
  return { store, gate, calls };
}

let current: ReturnType<typeof useAnalyticsConsent>;
function Probe({ onMount }: { onMount?: () => void }) {
  current = useAnalyticsConsent();
  useEffect(() => {
    onMount?.();
  }, [onMount]);
  return <Text>{current.status}</Text>;
}

async function render(
  { store, gate }: ReturnType<typeof setup>,
  onMount?: () => void,
) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <AnalyticsConsentProvider store={store} gate={gate}>
        <Probe onMount={onMount} />
      </AnalyticsConsentProvider>,
    );
  });
  return tree;
}

describe('AnalyticsConsentProvider', () => {
  it('renders nothing until the stored choice has been read', async () => {
    let release!: (status: AnalyticsConsentStatus) => void;
    const s = setup('unknown', {
      load: () => new Promise(resolve => (release = resolve)),
    });
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <AnalyticsConsentProvider store={s.store} gate={s.gate}>
          <Probe />
        </AnalyticsConsentProvider>,
      );
    });
    expect(tree.toJSON()).toBeNull();

    await ReactTestRenderer.act(async () => release('granted'));

    expect(tree.toJSON()).not.toBeNull();
  });

  it.each(['granted', 'denied', 'unknown'] as const)(
    'sets the gate to the stored %s choice before any child effect runs',
    async stored => {
      const s = setup(stored);

      await render(s, () => s.calls.push('child-mounted'));

      expect(s.calls).toEqual([`gate:${stored}`, 'child-mounted']);
      expect(current.status).toBe(stored);
    },
  );

  it('falls back to unknown when the read throws', async () => {
    const s = setup('throws');

    await render(s);

    expect(s.gate.setConsent).toHaveBeenCalledWith('unknown');
    expect(current.status).toBe('unknown');
  });

  it('allow() persists, opens the gate, then logs the consent event once', async () => {
    const s = setup();
    await render(s);

    await ReactTestRenderer.act(async () => current.allow());

    expect(s.calls).toEqual([
      'gate:unknown',
      'save:granted',
      'gate:granted',
      'event:analytics_consent_granted',
    ]);
    expect(current.status).toBe('granted');
  });

  it('deny() persists and closes the gate without logging anything', async () => {
    const s = setup();
    await render(s);

    await ReactTestRenderer.act(async () => current.deny());

    expect(s.calls).toEqual(['gate:unknown', 'save:denied', 'gate:denied']);
    expect(s.gate.logEvent).not.toHaveBeenCalled();
    expect(current.status).toBe('denied');
  });

  it('ignores a second tap while a choice is in flight', async () => {
    const s = setup();
    await render(s);

    await ReactTestRenderer.act(async () => {
      current.allow();
      current.allow();
      current.deny();
    });

    expect(s.store.save).toHaveBeenCalledTimes(1);
    expect(s.gate.logEvent).toHaveBeenCalledTimes(1);
    expect(current.status).toBe('granted');
  });

  it('ignores a tap once a choice has been made', async () => {
    const s = setup('denied');
    await render(s);

    await ReactTestRenderer.act(async () => current.allow());

    expect(s.store.save).not.toHaveBeenCalled();
    expect(current.status).toBe('denied');
  });

  it('applies the choice for the session when persisting fails', async () => {
    const s = setup('unknown', {
      save: jest.fn(async () => {
        throw new Error('disk full');
      }),
    });
    await render(s);

    await ReactTestRenderer.act(async () => current.allow());

    expect(s.gate.setConsent).toHaveBeenLastCalledWith('granted');
    expect(s.gate.logEvent).toHaveBeenCalledWith('analytics_consent_granted');
    expect(current.status).toBe('granted');
  });

  describe('setChoice (CheL-127)', () => {
    it('switching on applies at once, then saves, then logs the consent event', async () => {
      const s = setup('denied');
      await render(s);

      await ReactTestRenderer.act(async () => current.setChoice('granted'));

      expect(s.calls).toEqual([
        'gate:denied',
        'gate:granted',
        'save:granted',
        'event:analytics_consent_granted',
      ]);
      expect(current.status).toBe('granted');
    });

    it('switching off closes the gate and saves without logging anything', async () => {
      const s = setup('granted');
      await render(s);

      await ReactTestRenderer.act(async () => current.setChoice('denied'));

      expect(s.calls).toEqual(['gate:granted', 'gate:denied', 'save:denied']);
      expect(s.gate.logEvent).not.toHaveBeenCalled();
      expect(current.status).toBe('denied');
    });

    it('updates status and the gate before the save settles', async () => {
      let release!: () => void;
      const s = setup('granted', {
        save: jest.fn(() => new Promise<void>(resolve => (release = resolve))),
      });
      await render(s);

      await ReactTestRenderer.act(async () => {
        current.setChoice('denied');
      });

      expect(current.status).toBe('denied');
      expect(s.gate.setConsent).toHaveBeenLastCalledWith('denied');
      await ReactTestRenderer.act(async () => release());
    });

    it('does nothing when the choice equals the current status', async () => {
      const s = setup('granted');
      await render(s);

      await ReactTestRenderer.act(async () => current.setChoice('granted'));

      expect(s.store.save).not.toHaveBeenCalled();
      expect(s.gate.logEvent).not.toHaveBeenCalled();
      expect(s.gate.setConsent).toHaveBeenCalledTimes(1);
    });

    it('lets the last tap win: saves run in order, one at a time', async () => {
      const releases: (() => void)[] = [];
      const started: string[] = [];
      const s = setup('denied', {
        save: jest.fn(choice => {
          started.push(choice);
          return new Promise<void>(resolve => releases.push(resolve));
        }),
      });
      await render(s);

      await ReactTestRenderer.act(async () => {
        current.setChoice('granted');
        current.setChoice('denied');
        current.setChoice('granted');
      });
      expect(started).toEqual(['granted']);

      for (let i = 0; i < 3; i++) {
        await ReactTestRenderer.act(async () => releases[i]?.());
      }

      expect(started).toEqual(['granted', 'denied', 'granted']);
      expect(current.status).toBe('granted');
      expect(s.gate.setConsent).toHaveBeenLastCalledWith('granted');
    });

    it('keeps the choice for the session when saving fails', async () => {
      const s = setup('denied', {
        save: jest.fn(async () => {
          throw new Error('disk full');
        }),
      });
      await render(s);

      await ReactTestRenderer.act(async () => current.setChoice('granted'));

      expect(current.status).toBe('granted');
      expect(s.gate.setConsent).toHaveBeenLastCalledWith('granted');
      expect(s.gate.logEvent).toHaveBeenCalledWith('analytics_consent_granted');
    });

    it('does not undo allow() and deny() being one-shot for the dialog', async () => {
      const s = setup('unknown');
      await render(s);

      await ReactTestRenderer.act(async () => current.deny());
      await ReactTestRenderer.act(async () => current.allow());

      expect(current.status).toBe('denied');
    });
  });
});
