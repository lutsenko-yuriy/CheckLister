import type { AppLanguage } from './languages';

export type PluralCategory = 'one' | 'few' | 'many' | 'other';

/*
 * Hand-written CLDR cardinal rules (https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html)
 * instead of Intl.PluralRules, which Hermes does not reliably ship. Operands
 * follow CLDR: `i` is the integer part, `isInteger` stands for `v = 0`.
 *
 * fr's `many` (exact multiples of a million) is deliberately not returned:
 * item counts never reach it, and it would otherwise force every fr plural
 * entry to carry a `many` form.
 */
function oneIfExactlyOne(i: number, isInteger: boolean): PluralCategory {
  return isInteger && i === 1 ? 'one' : 'other';
}

function french(i: number): PluralCategory {
  return i === 0 || i === 1 ? 'one' : 'other';
}

function russian(i: number, isInteger: boolean): PluralCategory {
  if (!isInteger) {
    return 'other';
  }
  const mod10 = i % 10;
  const mod100 = i % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return 'one';
  }
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return 'few';
  }
  return 'many';
}

export function pluralCategory(
  language: AppLanguage,
  n: number,
): PluralCategory {
  const absolute = Math.abs(n);
  const i = Math.trunc(absolute);
  const isInteger = Number.isInteger(absolute);

  switch (language) {
    case 'en':
    case 'de':
      return oneIfExactlyOne(i, isInteger);
    case 'fr':
      return french(i);
    case 'ru':
      return russian(i, isInteger);
  }
}
