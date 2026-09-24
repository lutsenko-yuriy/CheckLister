/**
 * A plural entry: one form per CLDR category the language uses. `other` is
 * mandatory and is the fallback for any category a language leaves out, so
 * `other` is reserved for plural entries and must not name a key group.
 */
export interface PluralForms {
  readonly one?: string;
  readonly few?: string;
  readonly many?: string;
  readonly other: string;
}

interface TranslationTree {
  readonly [key: string]: string | PluralForms | TranslationTree;
}

// English is the source locale. #80 WU2 extracts every UI string into this
// object; WU1 only seeds it with one entry of each shape translate() handles.
const enStrings = {
  common: {
    appName: 'CheckLister',
    itemCount: { one: '{{count}} item', other: '{{count}} items' },
  },
  runHistory: {
    checklistTitle: '{{title}} history',
  },
} satisfies TranslationTree;

/*
 * The shape every other locale is typed against: string leaves widen to
 * `string` and plural leaves to `PluralForms`, so de/fr/ru must provide
 * exactly the same keys (missing or extra keys fail typecheck) while choosing
 * the plural categories their own language needs.
 */
type Widen<T> = T extends string
  ? string
  : T extends { other: string }
  ? PluralForms
  : { readonly [K in keyof T]: Widen<T[K]> };

export type Translations = Widen<typeof enStrings>;

export const en: Translations = enStrings;
