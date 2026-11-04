import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageAnalyticsConsentStore } from './analyticsConsentStore';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('AsyncStorageAnalyticsConsentStore', () => {
  it('loads unknown when nothing is stored', async () => {
    expect(await new AsyncStorageAnalyticsConsentStore().load()).toBe(
      'unknown',
    );
  });

  it.each(['granted', 'denied'] as const)('round-trips %s', async choice => {
    const store = new AsyncStorageAnalyticsConsentStore();

    await store.save(choice);

    expect(await store.load()).toBe(choice);
  });

  it('stores the choice with a decision timestamp under analyticsConsent', async () => {
    await new AsyncStorageAnalyticsConsentStore().save('granted');

    const raw = JSON.parse(
      (await AsyncStorage.getItem('analyticsConsent')) as string,
    );
    expect(raw.choice).toBe('granted');
    expect(Number.isNaN(Date.parse(raw.decidedAt))).toBe(false);
  });

  it('loads unknown when the stored value is malformed', async () => {
    await AsyncStorage.setItem('analyticsConsent', '{not json');

    expect(await new AsyncStorageAnalyticsConsentStore().load()).toBe(
      'unknown',
    );
  });

  it('loads unknown when the read throws', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('io'));

    expect(await new AsyncStorageAnalyticsConsentStore().load()).toBe(
      'unknown',
    );
  });
});
