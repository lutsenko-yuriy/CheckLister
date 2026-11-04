import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageKillSwitchOverrideStore } from './killSwitchOverrideStore';

beforeEach(async () => {
  await AsyncStorage.clear();
});
afterEach(() => jest.restoreAllMocks());

describe('AsyncStorageKillSwitchOverrideStore', () => {
  it('loads no overrides when nothing is stored', async () => {
    expect(await new AsyncStorageKillSwitchOverrideStore().load()).toEqual({});
  });

  it('round-trips overrides under killSwitchOverrides', async () => {
    const store = new AsyncStorageKillSwitchOverrideStore();

    await store.save({ runHistory: false });

    expect(await store.load()).toEqual({ runHistory: false });
    expect(await AsyncStorage.getItem('killSwitchOverrides')).toBe(
      '{"runHistory":false}',
    );
  });

  it('drops unknown ids and non-boolean values', async () => {
    await AsyncStorage.setItem(
      'killSwitchOverrides',
      '{"runHistory":true,"gone":false,"other":"x"}',
    );
    expect(await new AsyncStorageKillSwitchOverrideStore().load()).toEqual({
      runHistory: true,
    });
    await AsyncStorage.setItem('killSwitchOverrides', '{"runHistory":"no"}');
    expect(await new AsyncStorageKillSwitchOverrideStore().load()).toEqual({});
  });

  it.each(['{not json', '[1,2]', 'null', '7'])(
    'loads no overrides when the stored value is %s',
    async raw => {
      await AsyncStorage.setItem('killSwitchOverrides', raw);
      expect(await new AsyncStorageKillSwitchOverrideStore().load()).toEqual(
        {},
      );
    },
  );

  it('loads no overrides when the read fails', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('io'));
    expect(await new AsyncStorageKillSwitchOverrideStore().load()).toEqual({});
  });
});
