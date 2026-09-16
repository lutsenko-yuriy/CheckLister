import {generateId} from './ids';

describe('generateId', () => {
  it('returns a non-empty string', () => {
    expect(typeof generateId()).toBe('string');
    expect(generateId().length).toBeGreaterThan(0);
  });

  it('returns a different value on each call', () => {
    const ids = new Set(Array.from({length: 100}, () => generateId()));
    expect(ids.size).toBe(100);
  });
});
