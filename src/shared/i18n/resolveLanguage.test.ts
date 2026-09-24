import { SUPPORTED_LANGUAGES, type AppLanguage } from './languages';
import {
  isSameResolution,
  resolveLanguage,
  type PreferredLocale,
} from './resolveLanguage';

// The four languages the ticket ships once WU3 lands. Passing this set
// explicitly exercises the list-walking behaviour now, while the production
// SUPPORTED_LANGUAGES still only contains 'en'.
const ALL_LANGUAGES: readonly AppLanguage[] = ['en', 'de', 'fr', 'ru'];

function locales(...codes: string[]): PreferredLocale[] {
  return codes.map(code => ({ languageCode: code }));
}

describe('SUPPORTED_LANGUAGES', () => {
  it('contains only English until the translations land', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en']);
  });
});

describe('resolveLanguage against the full target language set', () => {
  it.each`
    preferred                   | appLanguage | requestedLanguage
    ${['en']}                   | ${'en'}     | ${'en'}
    ${['de']}                   | ${'de'}     | ${'de'}
    ${['fr']}                   | ${'fr'}     | ${'fr'}
    ${['ru']}                   | ${'ru'}     | ${'ru'}
    ${['ja', 'de']}             | ${'de'}     | ${'ja'}
    ${['ja', 'pt']}             | ${'en'}     | ${'ja'}
    ${['zh', 'pt', 'fr', 'de']} | ${'fr'}     | ${'zh'}
    ${['de', 'en']}             | ${'de'}     | ${'de'}
    ${['en', 'ru']}             | ${'en'}     | ${'en'}
  `(
    '$preferred → app $appLanguage, requested $requestedLanguage',
    ({ preferred, appLanguage, requestedLanguage }) => {
      const result = resolveLanguage(
        locales(...preferred),
        'DE',
        ALL_LANGUAGES,
      );

      expect(result.appLanguage).toBe(appLanguage);
      expect(result.requestedLanguage).toBe(requestedLanguage);
    },
  );
});

describe('resolveLanguage with the production SUPPORTED_LANGUAGES', () => {
  it.each`
    preferred       | appLanguage | requestedLanguage
    ${['en']}       | ${'en'}     | ${'en'}
    ${['en', 'de']} | ${'en'}     | ${'en'}
    ${['de', 'en']} | ${'en'}     | ${'de'}
    ${['ja', 'pt']} | ${'en'}     | ${'ja'}
    ${['ru', 'fr']} | ${'en'}     | ${'ru'}
    ${['zh']}       | ${'en'}     | ${'zh'}
    ${['pt']}       | ${'en'}     | ${'pt'}
  `(
    '$preferred → app $appLanguage, requested $requestedLanguage',
    ({ preferred, appLanguage, requestedLanguage }) => {
      const result = resolveLanguage(locales(...preferred), 'US');

      expect(result.appLanguage).toBe(appLanguage);
      expect(result.requestedLanguage).toBe(requestedLanguage);
    },
  );

  it('falls back to English for both languages when the OS reports no locales', () => {
    expect(resolveLanguage([], 'US')).toEqual({
      appLanguage: 'en',
      requestedLanguage: 'en',
      region: 'US',
    });
  });
});

describe('resolveLanguage normalisation', () => {
  it('matches language codes case-insensitively and reports them lower-cased', () => {
    const result = resolveLanguage(locales('JA', 'DE'), 'AT', ALL_LANGUAGES);

    expect(result).toEqual({
      appLanguage: 'de',
      requestedLanguage: 'ja',
      region: 'AT',
    });
  });

  it('upper-cases the country code', () => {
    expect(resolveLanguage(locales('en'), 'ca').region).toBe('CA');
  });

  it.each(['', '   ', '419', 'USA', 'U'])(
    'omits the region entirely when the country is %j',
    country => {
      const result = resolveLanguage(locales('en'), country);

      expect(result).toEqual({ appLanguage: 'en', requestedLanguage: 'en' });
      expect('region' in result).toBe(false);
    },
  );
});

describe('isSameResolution', () => {
  it.each`
    a                                                               | b                                                               | same
    ${{ appLanguage: 'en', requestedLanguage: 'ja', region: 'JP' }} | ${{ appLanguage: 'en', requestedLanguage: 'ja', region: 'JP' }} | ${true}
    ${{ appLanguage: 'en', requestedLanguage: 'ja' }}               | ${{ appLanguage: 'en', requestedLanguage: 'ja' }}               | ${true}
    ${{ appLanguage: 'en', requestedLanguage: 'ja' }}               | ${{ appLanguage: 'en', requestedLanguage: 'pt' }}               | ${false}
    ${{ appLanguage: 'en', requestedLanguage: 'de' }}               | ${{ appLanguage: 'de', requestedLanguage: 'de' }}               | ${false}
    ${{ appLanguage: 'en', requestedLanguage: 'en', region: 'US' }} | ${{ appLanguage: 'en', requestedLanguage: 'en' }}               | ${false}
  `('compares the full tuple ($a vs $b → $same)', ({ a, b, same }) => {
    expect(isSameResolution(a, b)).toBe(same);
  });
});
