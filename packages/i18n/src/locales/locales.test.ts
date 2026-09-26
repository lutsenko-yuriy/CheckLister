import { SUPPORTED_LANGUAGES, type AppLanguage } from '../languages';
import { pluralCategory, type PluralCategory } from '../plural';
import { de } from './de';
import { en, type PluralForms } from './en';
import { fr } from './fr';
import { ru } from './ru';

// English-identical values that are expected, not a missed translation.
const ALLOWLIST = new Set(['common.appName']);

const LOCALES: Readonly<Record<AppLanguage, unknown>> = { en, de, fr, ru };

const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;

function isPluralForms(value: unknown): value is PluralForms {
  return (
    typeof value === 'object' &&
    value !== null &&
    'other' in value &&
    typeof (value as PluralForms).other === 'string'
  );
}

function placeholders(text: string): Set<string> {
  return new Set(
    [...text.matchAll(PLACEHOLDER_PATTERN)].map(match => match[1]),
  );
}

function categoriesUsedBy(language: AppLanguage): readonly PluralCategory[] {
  const categories: PluralCategory[] = [];
  for (const n of [0, 1, 2, 3, 5, 11, 12, 21, 22, 25, 111]) {
    const category = pluralCategory(language, n);
    if (!categories.includes(category)) {
      categories.push(category);
    }
  }
  return categories;
}

function walk(
  path: string,
  enNode: unknown,
  localeNode: unknown,
  language: AppLanguage,
  visit: (path: string, enValue: string | PluralForms, value: unknown) => void,
): void {
  if (typeof enNode === 'string' || isPluralForms(enNode)) {
    visit(path, enNode, localeNode);
    return;
  }
  for (const key of Object.keys(enNode as Record<string, unknown>)) {
    walk(
      path === '' ? key : `${path}.${key}`,
      (enNode as Record<string, unknown>)[key],
      (localeNode as Record<string, unknown> | undefined)?.[key],
      language,
      visit,
    );
  }
}

describe.each(SUPPORTED_LANGUAGES.filter(language => language !== 'en'))(
  'locale integrity: %s',
  language => {
    const locale = LOCALES[language];

    it('has exactly the same key set as English', () => {
      const enKeys: string[] = [];
      walk('', en, en, language, path => enKeys.push(path));
      const localeKeys: string[] = [];
      walk('', en, locale, language, path => localeKeys.push(path));

      const missing = enKeys.filter(key => {
        let value: unknown = locale;
        for (const segment of key.split('.')) {
          if (typeof value !== 'object' || value === null) {
            return true;
          }
          value = (value as Record<string, unknown>)[segment];
        }
        return value === undefined;
      });

      expect(missing).toEqual([]);
      expect(localeKeys.sort()).toEqual(enKeys.sort());
    });

    it('preserves every {{placeholder}} from the English source', () => {
      walk('', en, locale, language, (path, enValue, value) => {
        if (typeof enValue === 'string') {
          expect({ path, placeholders: placeholders(value as string) }).toEqual(
            { path, placeholders: placeholders(enValue) },
          );
          return;
        }
        for (const category of Object.keys(enValue) as (keyof PluralForms)[]) {
          const enForm = enValue[category];
          if (enForm === undefined) {
            continue;
          }
          const localeForm = (value as PluralForms)[category];
          if (localeForm === undefined) {
            continue;
          }
          expect({
            path: `${path}.${category}`,
            placeholders: placeholders(localeForm),
          }).toEqual({
            path: `${path}.${category}`,
            placeholders: placeholders(enForm),
          });
        }
      });
    });

    it('has no empty values and no English-identical values outside the allowlist', () => {
      walk('', en, locale, language, (path, enValue, value) => {
        if (typeof enValue === 'string') {
          expect((value as string).length).toBeGreaterThan(0);
          if (!ALLOWLIST.has(path)) {
            expect(value).not.toBe(enValue);
          }
          return;
        }
        for (const category of Object.keys(
          value as PluralForms,
        ) as (keyof PluralForms)[]) {
          const form = (value as PluralForms)[category];
          if (form === undefined) {
            continue;
          }
          expect(form.length).toBeGreaterThan(0);
        }
      });
    });

    it('provides every plural category this language can select', () => {
      const requiredCategories = categoriesUsedBy(language);
      walk('', en, locale, language, (path, enValue, value) => {
        if (!isPluralForms(enValue)) {
          return;
        }
        for (const category of requiredCategories) {
          expect({
            path,
            category,
            has: (value as PluralForms)[category] !== undefined,
          }).toEqual({ path, category, has: true });
        }
      });
    });
  },
);
