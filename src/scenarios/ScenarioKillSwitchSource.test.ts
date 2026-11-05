import { ScenarioKillSwitchSource } from './ScenarioKillSwitchSource';

const OFF = '{"enabled":false,"min_version":"0.0.0"}';

describe('ScenarioKillSwitchSource', () => {
  it('starts empty, so every switch stays on', async () => {
    const source = new ScenarioKillSwitchSource();
    expect(await source.loadActivated()).toEqual({});
  });

  it('never activates a fetch', async () => {
    expect(await new ScenarioKillSwitchSource().fetchAndActivate()).toBe(false);
  });

  it('returns what was set', async () => {
    const source = new ScenarioKillSwitchSource();
    source.set('runHistory', OFF);
    expect(await source.loadActivated()).toEqual({ runHistory: OFF });
  });

  it('hands out snapshots, not the live store', async () => {
    const source = new ScenarioKillSwitchSource();
    source.set('runHistory', OFF);
    const snapshot = await source.loadActivated();
    source.reset();
    expect(snapshot).toEqual({ runHistory: OFF });
    expect(await source.loadActivated()).toEqual({});
  });

  it('notifies subscribers on set and reset until they unsubscribe', () => {
    const source = new ScenarioKillSwitchSource();
    const listener = jest.fn();
    const unsubscribe = source.subscribe(listener);
    source.set('runHistory', OFF);
    source.reset();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    source.set('runHistory', OFF);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
