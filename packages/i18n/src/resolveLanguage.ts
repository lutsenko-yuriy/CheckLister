import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
} from './languages';

/** The subset of react-native-localize's `Locale` this module reads. */
export interface PreferredLocale {
  readonly languageCode: string;
}

export interface LanguageResolution {
  /** Language the UI is rendered in. */
  readonly appLanguage: AppLanguage;
  /** Bare language code of the top OS preference, supported or not. */
  readonly requestedLanguage: string;
  /** ISO 3166-1 alpha-2 device country; absent when the OS reports none. */
  readonly region?: string;
}

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

function findSupportedLanguage(
  languageCodes: readonly string[],
  supported: readonly AppLanguage[],
): AppLanguage | undefined {
  for (const code of languageCodes) {
    const match = supported.find(language => language === code);
    if (match !== undefined) {
      return match;
    }
  }
  return undefined;
}

function normalizeRegion(country: string): string | undefined {
  const upper = country.trim().toUpperCase();
  return COUNTRY_CODE_PATTERN.test(upper) ? upper : undefined;
}

/**
 * Walks the OS preferred-locale list (already reflecting any per-app
 * language) and picks the first supported language, so the JS UI agrees with
 * the language the OS picks for native resources. Falls back to English.
 *
 * `supported` is a parameter only so the walking behaviour can be tested
 * against the full target language set; production uses the default.
 */
export function resolveLanguage(
  locales: readonly PreferredLocale[],
  country: string,
  supported: readonly AppLanguage[] = SUPPORTED_LANGUAGES,
): LanguageResolution {
  const languageCodes = locales.map(locale =>
    locale.languageCode.toLowerCase(),
  );
  const appLanguage =
    findSupportedLanguage(languageCodes, supported) ?? DEFAULT_LANGUAGE;
  const requestedLanguage = languageCodes[0] ?? appLanguage;
  const region = normalizeRegion(country);

  return region === undefined
    ? { appLanguage, requestedLanguage }
    : { appLanguage, requestedLanguage, region };
}

export function isSameResolution(
  a: LanguageResolution,
  b: LanguageResolution,
): boolean {
  return (
    a.appLanguage === b.appLanguage &&
    a.requestedLanguage === b.requestedLanguage &&
    a.region === b.region
  );
}
