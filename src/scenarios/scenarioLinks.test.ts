import { parseRemoteSwitch } from '../shared/killSwitches/killSwitches';
import { parseScenarioLink } from './scenarioLinks';

describe('parseScenarioLink', () => {
  it('returns null for links that are not scenario links', () => {
    expect(parseScenarioLink('checklister://run?checklistId=a')).toBeNull();
    expect(parseScenarioLink('other://scenarios/analytics')).toBeNull();
    expect(parseScenarioLink('not a url')).toBeNull();
  });

  it('parses a kill-switch off command with a default min_version', () => {
    const command = parseScenarioLink(
      'checklister://scenarios/kill-switch?id=runHistory&enabled=false',
    );
    expect(command).toEqual({
      type: 'kill-switch',
      id: 'runHistory',
      raw: expect.any(String),
    });
    if (command?.type !== 'kill-switch') {
      throw new Error('unreachable');
    }
    expect(parseRemoteSwitch(command.raw)).toEqual({
      enabled: false,
      minVersion: '0.0.0',
    });
  });

  it('honours an explicit min_version and enabled=true', () => {
    const command = parseScenarioLink(
      'checklister://scenarios/kill-switch?id=runHistory&enabled=true&min_version=9.9.9',
    );
    if (command?.type !== 'kill-switch') {
      throw new Error('expected kill-switch');
    }
    expect(parseRemoteSwitch(command.raw)).toEqual({
      enabled: true,
      minVersion: '9.9.9',
    });
  });

  it('parses the reset command', () => {
    expect(
      parseScenarioLink('checklister://scenarios/kill-switch/reset'),
    ).toEqual({ type: 'reset' });
  });

  it.each([
    'checklister://scenarios/kill-switch?id=nope&enabled=false',
    'checklister://scenarios/kill-switch?id=runHistory&enabled=maybe',
    'checklister://scenarios/kill-switch?id=runHistory',
    'checklister://scenarios/kill-switch?id=runHistory&enabled=true&min_version=x',
    'checklister://scenarios/nothing',
    'checklister://scenarios',
  ])('maps %s to an unknown command', url => {
    expect(parseScenarioLink(url)).toEqual({ type: 'unknown' });
  });

  it('parses the analytics commands', () => {
    expect(parseScenarioLink('checklister://scenarios/analytics')).toEqual({
      type: 'analytics',
    });
    expect(parseScenarioLink('checklister://scenarios/analytics/')).toEqual({
      type: 'analytics',
    });
    expect(
      parseScenarioLink('checklister://scenarios/analytics/clear'),
    ).toEqual({ type: 'analytics-clear' });
  });

  it('maps an unknown analytics sub-path to an unknown command', () => {
    expect(
      parseScenarioLink('checklister://scenarios/analytics/other'),
    ).toEqual({ type: 'unknown' });
  });
});
