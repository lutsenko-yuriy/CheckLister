import { Alert } from 'react-native';
import { handleScenarioLink } from './handleScenarioLink';
import { scenarioKillSwitchSource } from './ScenarioKillSwitchSource';

const OFF = '{"enabled":false,"min_version":"0.0.0"}';

describe('handleScenarioLink', () => {
  beforeEach(() => {
    scenarioKillSwitchSource.reset();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('ignores links that are not scenario links', async () => {
    expect(handleScenarioLink('checklister://run?x=1')).toBe(false);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('sets the stub from a kill-switch link', async () => {
    expect(
      handleScenarioLink(
        'checklister://scenarios/kill-switch?id=runHistory&enabled=false',
      ),
    ).toBe(true);
    expect(await scenarioKillSwitchSource.loadActivated()).toEqual({
      runHistory: OFF,
    });
  });

  it('is idempotent when the same link arrives twice', async () => {
    const url =
      'checklister://scenarios/kill-switch?id=runHistory&enabled=false';
    handleScenarioLink(url);
    handleScenarioLink(url);
    expect(await scenarioKillSwitchSource.loadActivated()).toEqual({
      runHistory: OFF,
    });
  });

  it('clears the stub on reset', async () => {
    handleScenarioLink(
      'checklister://scenarios/kill-switch?id=runHistory&enabled=false',
    );
    handleScenarioLink('checklister://scenarios/kill-switch/reset');
    expect(await scenarioKillSwitchSource.loadActivated()).toEqual({});
  });

  it('alerts on an unknown command and changes nothing', async () => {
    expect(
      handleScenarioLink(
        'checklister://scenarios/kill-switch?id=nope&enabled=false',
      ),
    ).toBe(true);
    expect(Alert.alert).toHaveBeenCalledWith('Unknown scenario command');
    expect(await scenarioKillSwitchSource.loadActivated()).toEqual({});
  });
});
