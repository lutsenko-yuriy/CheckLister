import type { AppLanguage } from './languages';
import { en, type PluralForms, type Translations } from './locales/en';
import { pluralCategory } from './plural';

export type TranslationParams = Readonly<Record<string, string | number>>;

type Message = string | PluralForms;

/** Every dotted path to a string or plural leaf of `Translations`. */
type LeafKeys<T> = {
  [K in keyof T & string]: T[K] extends Message ? K : `${K}.${LeafKeys<T[K]>}`;
}[keyof T & string];

export type TranslationKey = LeafKeys<Translations>;

// Languages without a locale file yet (until #80 WU3) render in English.
const LOCALES: Readonly<Partial<Record<AppLanguage, Translations>>> = { en };

const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;

function isMessage(value: unknown): value is Message {
  return (
    typeof value === 'string' ||
    (typeof value === 'object' &&
      value !== null &&
      'other' in value &&
      typeof value.other === 'string')
  );
}

function lookup(translations: Translations, key: string): Message | undefined {
  let node: unknown = translations;
  for (const segment of key.split('.')) {
    // Own properties only, so a key can never resolve to something on
    // Object.prototype such as `constructor`.
    if (
      typeof node !== 'object' ||
      node === null ||
      !Object.prototype.hasOwnProperty.call(node, segment)
    ) {
      return undefined;
    }
    node = Reflect.get(node, segment);
  }
  return isMessage(node) ? node : undefined;
}

function interpolate(template: string, params: TranslationParams): string {
  // A replacer function (not a replacement string) keeps `$&`-style
  // sequences in user content literal, and each placeholder is replaced in
  // a single pass so a value that itself looks like `{{x}}` stays verbatim.
  return template.replace(PLACEHOLDER_PATTERN, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });
}

/** Resolves one message (plain or plural) for `language` and interpolates. */
export function formatMessage(
  language: AppLanguage,
  message: Message,
  params: TranslationParams = {},
): string {
  if (typeof message === 'string') {
    return interpolate(message, params);
  }
  const count = params.count;
  const category =
    typeof count === 'number' ? pluralCategory(language, count) : 'other';
  return interpolate(message[category] ?? message.other, params);
}

export function translate(
  language: AppLanguage,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  const message = lookup(LOCALES[language] ?? en, key);
  return message === undefined ? key : formatMessage(language, message, params);
}

function localeTag(language: AppLanguage, region: string | undefined): string {
  return region === undefined ? language : `${language}-${region}`;
}

// Constructing an Intl.DateTimeFormat is the expensive part (ICU via JNI on
// Android Hermes), and a history list formats one date per row per render.
const dateTimeFormats = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormat(tag: string): Intl.DateTimeFormat {
  let format = dateTimeFormats.get(tag);
  if (format === undefined) {
    format = createDateTimeFormat(tag);
    dateTimeFormats.set(tag, format);
  }
  return format;
}

function createDateTimeFormat(tag: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(tag, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    // Older Hermes builds reject dateStyle/timeStyle with a RangeError;
    // spell the equivalent fields out instead.
    return new Intl.DateTimeFormat(tag, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

/**
 * Formats a persisted ISO timestamp in the UI language, using the device
 * region for conventions such as 24-hour time (`appLanguage[-region]`).
 */
export function formatDateTime(
  language: AppLanguage,
  region: string | undefined,
  isoString: string,
): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return getDateTimeFormat(localeTag(language, region)).format(date);
}
