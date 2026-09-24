/** Every language the app can be rendered in (#80). */
export type AppLanguage = 'en' | 'de' | 'fr' | 'ru';

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

/**
 * Single source of truth for the languages that have a locale file. The
 * native declarations (Info.plist CFBundleLocalizations, Android
 * locales_config.xml) are drift-tested against this list in
 * `nativeLocales.test.ts`.
 */
export const SUPPORTED_LANGUAGES: readonly AppLanguage[] = [
  'en',
  'de',
  'fr',
  'ru',
];
