import {
  compareVersions,
  KILL_SWITCHES,
  parseRemoteSwitch,
  resolveKillSwitch,
} from './killSwitches';

describe('compareVersions', () => {
  it.each([
    ['0.9.0', '0.10.0', -1],
    ['1.0.0', '0.99.99', 1],
    ['0.16.0', '0.16.0', 0],
  ])('%s vs %s', (a, b, expected) => {
    expect(Math.sign(compareVersions(a, b))).toBe(expected);
  });
});

describe('parseRemoteSwitch', () => {
  it('parses enabled and min_version', () => {
    expect(
      parseRemoteSwitch('{"enabled":false,"min_version":"0.16.0"}'),
    ).toEqual({ enabled: false, minVersion: '0.16.0' });
  });

  it.each([
    '',
    'nope',
    '{}',
    '[]',
    'null',
    '{"enabled":"yes","min_version":"0.16.0"}',
    '{"enabled":false}',
    '{"enabled":false,"min_version":"0.16"}',
    '{"enabled":false,"min_version":16}',
    '{"enabled":false,"min_version":"v0.16.0"}',
  ])('treats %j as no remote value', raw => {
    expect(parseRemoteSwitch(raw)).toBeNull();
  });
});

describe('resolveKillSwitch', () => {
  const remoteOff = { enabled: false, minVersion: '0.16.0' };

  it('defaults to on', () => {
    expect(
      resolveKillSwitch({ appVersion: '0.16.0', remote: null, override: null }),
    ).toEqual({ enabled: true, source: 'default' });
  });

  it.each([
    ['equal', '0.16.0'],
    ['newer', '0.17.0'],
  ])('applies the remote value when the app is %s to min_version', (_n, v) => {
    expect(
      resolveKillSwitch({ appVersion: v, remote: remoteOff, override: null }),
    ).toEqual({ enabled: false, source: 'remote' });
  });

  it('ignores the remote value on an older app', () => {
    expect(
      resolveKillSwitch({
        appVersion: '0.15.0',
        remote: remoteOff,
        override: null,
      }),
    ).toEqual({ enabled: true, source: 'ignored' });
  });

  it('applies a remote on', () => {
    expect(
      resolveKillSwitch({
        appVersion: '0.16.0',
        remote: { enabled: true, minVersion: '0.16.0' },
        override: null,
      }),
    ).toEqual({ enabled: true, source: 'remote' });
  });

  it.each([true, false])('override %s beats remote', override => {
    expect(
      resolveKillSwitch({ appVersion: '0.16.0', remote: remoteOff, override }),
    ).toEqual({ enabled: override, source: 'override' });
  });
});

it('registers run history', () => {
  expect(KILL_SWITCHES.runHistory.remoteKey).toBe('kill_switch_run_history');
});
