import AsyncStorage from '@react-native-async-storage/async-storage';
import { getJson, setJson } from './jsonStorage';

describe('jsonStorage', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns the fallback when nothing is stored', async () => {
    const value = await getJson('missing-key', ['fallback']);
    expect(value).toEqual(['fallback']);
  });

  it('round-trips a value through set and get', async () => {
    await setJson('key', { a: 1, b: [2, 3] });
    const value = await getJson('key', null);
    expect(value).toEqual({ a: 1, b: [2, 3] });
  });

  it('returns the fallback when stored JSON is corrupt', async () => {
    await AsyncStorage.setItem('key', 'not json');
    const value = await getJson('key', 'fallback');
    expect(value).toBe('fallback');
  });
});
