import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DebugScreen } from './DebugScreen';
import * as killSwitches from '../../../shared/killSwitches/useKillSwitches';

function mockDebug(override: boolean | null) {
  const api = {
    switches: [
      {
        id: 'runHistory' as const,
        label: 'Run history',
        enabled: override ?? true,
        source:
          override === null ? ('default' as const) : ('override' as const),
        override,
      },
    ],
    setOverride: jest.fn(),
    resetOverride: jest.fn(),
    resetAll: jest.fn(),
  };
  jest.spyOn(killSwitches, 'useKillSwitchDebug').mockReturnValue(api);
  return api;
}

afterEach(() => jest.restoreAllMocks());

describe('DebugScreen', () => {
  it('lists each kill-switch with its state and source', async () => {
    mockDebug(null);
    await render(<DebugScreen />);

    expect(screen.getByTestId('debug-screen')).toBeTruthy();
    expect(screen.getByText('Run history')).toBeTruthy();
    expect(screen.getByText('default')).toBeTruthy();
    expect(screen.getByTestId('kill-switch-runHistory').props.value).toBe(true);
  });

  it('shows the ignored-by-min-version source in words', async () => {
    const api = mockDebug(null);
    api.switches[0].source = 'ignored' as never;
    await render(<DebugScreen />);

    expect(screen.getByText('ignored: min version')).toBeTruthy();
  });

  it('toggling a switch sets an override', async () => {
    const api = mockDebug(null);
    await render(<DebugScreen />);

    await fireEvent(
      screen.getByTestId('kill-switch-runHistory'),
      'valueChange',
      false,
    );

    expect(api.setOverride).toHaveBeenCalledWith('runHistory', false);
  });

  it('shows the per-row Reset only while an override is set', async () => {
    mockDebug(null);
    const { unmount } = await render(<DebugScreen />);
    expect(screen.queryByTestId('reset-runHistory')).toBeNull();
    await unmount();

    mockDebug(false);
    await render(<DebugScreen />);
    expect(screen.getByText('override')).toBeTruthy();
    expect(screen.getByTestId('reset-runHistory')).toBeTruthy();
  });

  it('Reset clears one override and Reset all clears every override', async () => {
    const api = mockDebug(false);
    await render(<DebugScreen />);

    await fireEvent.press(screen.getByTestId('reset-runHistory'));
    expect(api.resetOverride).toHaveBeenCalledWith('runHistory');

    await fireEvent.press(screen.getByText('Reset all overrides'));
    expect(api.resetAll).toHaveBeenCalled();
  });
});
