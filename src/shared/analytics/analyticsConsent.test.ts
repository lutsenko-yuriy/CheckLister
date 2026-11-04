import { parseStoredConsent } from './analyticsConsent';

describe('parseStoredConsent', () => {
  it.each(['granted', 'denied'] as const)(
    'reads a stored %s choice',
    choice => {
      expect(
        parseStoredConsent({ choice, decidedAt: '2026-11-04T10:00:00.000Z' }),
      ).toBe(choice);
    },
  );

  it.each([
    ['missing', null],
    ['undefined', undefined],
    ['a string', 'granted'],
    ['an empty object', {}],
    ['an unknown choice', { choice: 'maybe', decidedAt: '2026-11-04' }],
    ['an unknown choice value', { choice: 'unknown', decidedAt: '2026-11-04' }],
    ['no timestamp', { choice: 'granted' }],
    ['a non-string timestamp', { choice: 'granted', decidedAt: 5 }],
  ])('parses %s as unknown', (_label, value) => {
    expect(parseStoredConsent(value)).toBe('unknown');
  });
});
