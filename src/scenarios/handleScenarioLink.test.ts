import { Alert } from 'react-native';
import { handleScenarioLink } from './handleScenarioLink';
import { recordingAnalyticsService } from './RecordingAnalyticsService';
import { scenarioKillSwitchSource } from './ScenarioKillSwitchSource';
import { scenarioPhotoPicker } from './ScenarioPhotoPicker';

const handle = (url: string) => handleScenarioLink(url, jest.fn());
const OFF = '{"enabled":false,"min_version":"0.0.0"}';

describe('handleScenarioLink', () => {
  beforeEach(() => {
    scenarioKillSwitchSource.reset();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('ignores links that are not scenario links', async () => {
    expect(handleScenarioLink('checklister://run?x=1', jest.fn())).toBe(false);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('sets the stub from a kill-switch link', async () => {
    expect(
      handle('checklister://scenarios/kill-switch?id=runHistory&enabled=false'),
    ).toBe(true);
    expect(await scenarioKillSwitchSource.loadActivated()).toEqual({
      runHistory: OFF,
    });
  });

  it('is idempotent when the same link arrives twice', async () => {
    const url =
      'checklister://scenarios/kill-switch?id=runHistory&enabled=false';
    handle(url);
    handle(url);
    expect(await scenarioKillSwitchSource.loadActivated()).toEqual({
      runHistory: OFF,
    });
  });

  it('clears the stub on reset', async () => {
    handle('checklister://scenarios/kill-switch?id=runHistory&enabled=false');
    handle('checklister://scenarios/kill-switch/reset');
    expect(await scenarioKillSwitchSource.loadActivated()).toEqual({});
  });

  it('alerts on an unknown command and changes nothing', async () => {
    expect(
      handle('checklister://scenarios/kill-switch?id=nope&enabled=false'),
    ).toBe(true);
    expect(Alert.alert).toHaveBeenCalledWith('Unknown scenario command');
    expect(await scenarioKillSwitchSource.loadActivated()).toEqual({});
  });

  it('opens the events screen on an analytics link, however often it arrives', () => {
    const openEvents = jest.fn();
    const url = 'checklister://scenarios/analytics';

    expect(handleScenarioLink(url, openEvents)).toBe(true);
    handleScenarioLink(url, openEvents);

    expect(openEvents).toHaveBeenCalledTimes(2);
  });

  it('clears the recorded events on analytics/clear without opening anything', () => {
    const openEvents = jest.fn();
    recordingAnalyticsService.clear();
    recordingAnalyticsService.logEvent('item_added');

    expect(
      handleScenarioLink('checklister://scenarios/analytics/clear', openEvents),
    ).toBe(true);

    expect(recordingAnalyticsService.getRecords()).toEqual([]);
    expect(openEvents).not.toHaveBeenCalled();
  });

  it('sets the photo picker outcome from a photo-picker link', async () => {
    expect(handle('checklister://scenarios/photo-picker?result=denied')).toBe(
      true,
    );
    expect(await scenarioPhotoPicker.pick('camera')).toEqual({
      type: 'denied',
    });

    handle('checklister://scenarios/photo-picker?result=picked');
    expect((await scenarioPhotoPicker.pick('camera')).type).toBe('picked');
  });
});
