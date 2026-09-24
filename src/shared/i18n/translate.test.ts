import { formatDateTime, formatMessage, translate } from './translate';

describe('translate', () => {
  it('looks up a plain string by dotted key', () => {
    expect(translate('en', 'common.appName')).toBe('CheckLister');
  });

  it('interpolates {{param}} placeholders', () => {
    expect(
      translate('en', 'runHistory.checklistTitle', { title: 'Groceries' }),
    ).toBe('Groceries history');
  });

  it('inserts user content verbatim, even when it looks like a placeholder', () => {
    expect(
      translate('en', 'runHistory.checklistTitle', { title: '{{title}} $&' }),
    ).toBe('{{title}} $& history');
  });

  it.each`
    count | expected
    ${1}  | ${'1 item'}
    ${0}  | ${'0 items'}
    ${7}  | ${'7 items'}
  `('selects the plural form for count $count', ({ count, expected }) => {
    expect(translate('en', 'common.itemCount', { count })).toBe(expected);
  });

  it('rejects unknown keys at compile time and renders the key at runtime', () => {
    // @ts-expect-error — not a leaf path of Translations
    expect(translate('en', 'common.missing')).toBe('common.missing');
    // @ts-expect-error — a key group is not a message
    expect(translate('en', 'common')).toBe('common');
  });

  it('looks up a plain string in another locale', () => {
    expect(translate('ru', 'common.itemCount', { count: 1 })).toBe('1 пункт');
  });
});

describe('formatMessage', () => {
  const russianItems = {
    one: '{{count}} пункт',
    few: '{{count}} пункта',
    many: '{{count}} пунктов',
    other: '{{count}} пункта',
  };

  it.each`
    count  | expected
    ${1}   | ${'1 пункт'}
    ${2}   | ${'2 пункта'}
    ${7}   | ${'7 пунктов'}
    ${21}  | ${'21 пункт'}
    ${1.5} | ${'1.5 пункта'}
  `('selects the ru $count form', ({ count, expected }) => {
    expect(formatMessage('ru', russianItems, { count })).toBe(expected);
  });

  it('falls back to `other` when the language omits a category', () => {
    expect(
      formatMessage(
        'ru',
        { one: '{{count}} x', other: '{{count}} y' },
        {
          count: 5,
        },
      ),
    ).toBe('5 y');
  });

  it('uses `other` when a plural message gets no numeric count', () => {
    expect(formatMessage('en', { one: 'one', other: 'many' })).toBe('many');
  });

  it('leaves a placeholder visible when its param is missing', () => {
    expect(formatMessage('en', 'Hello {{name}}', {})).toBe('Hello {{name}}');
  });
});

describe('formatDateTime', () => {
  // Built from local components so the expected wall-clock time does not
  // depend on the machine's time zone.
  const iso = new Date(2026, 8, 24, 14, 5).toISOString();

  it.each`
    language | region       | expected
    ${'de'}  | ${'DE'}      | ${'24.09.2026, 14:05'}
    ${'en'}  | ${'GB'}      | ${'24 Sept 2026, 14:05'}
    ${'fr'}  | ${'FR'}      | ${'24 sept. 2026, 14:05'}
    ${'ru'}  | ${'RU'}      | ${'24 сент. 2026 г., 14:05'}
    ${'en'}  | ${undefined} | ${'Sep 24, 2026, 2:05 PM'}
  `('formats for $language-$region', ({ language, region, expected }) => {
    const normalize = (s: string) => s.replace(/[  ]/g, ' ');
    expect(normalize(formatDateTime(language, region, iso))).toBe(expected);
  });

  it('returns the input unchanged when it is not a valid date', () => {
    expect(formatDateTime('en', 'US', 'not-a-date')).toBe('not-a-date');
  });

  it('falls back to explicit fields when dateStyle/timeStyle are unsupported', () => {
    const RealDateTimeFormat = Intl.DateTimeFormat;
    const spy = jest
      .spyOn(Intl, 'DateTimeFormat')
      .mockImplementation((locale, options) => {
        if (options?.dateStyle !== undefined) {
          throw new RangeError('dateStyle not supported');
        }
        return new RealDateTimeFormat(locale, options);
      });

    // A tag no other test uses, since formatters are cached per tag.
    const result = formatDateTime('de', 'LI', iso);

    spy.mockRestore();
    expect(result).toBe('24.09.2026, 14:05');
  });

  it('reuses one formatter per locale tag across calls', () => {
    const spy = jest.spyOn(Intl, 'DateTimeFormat');

    formatDateTime('fr', 'BE', iso);
    formatDateTime('fr', 'BE', iso);
    formatDateTime('fr', 'BE', new Date(2026, 0, 1).toISOString());

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
