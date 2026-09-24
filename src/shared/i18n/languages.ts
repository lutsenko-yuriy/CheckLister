/**
 * Every language the app can ever be rendered in. The union is deliberately
 * wider than SUPPORTED_LANGUAGES while #80's translations are still landing:
 * WU3 extends the list below without changing this exported type.
 */
export type AppLanguage = 'en' | 'de' | 'fr' | 'ru';

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

/**
 * Single source of truth for the languages that have a locale file. The
 * native declarations (Info.plist CFBundleLocalizations, Android
 * locales_config.xml) are drift-tested against this list — added in WU4.
 */
export const SUPPORTED_LANGUAGES: readonly AppLanguage[] = [
  'en',
  'de',
  'fr',
  'ru',
];
