# ADR-0003 — localize with a small typed in-house i18n module on top of react-native-localize instead of an i18n framework

## Status
`accepted`

## Context
#80 localizes CheckLister into German, French and Russian. The app has roughly 50 UI strings, four languages, no in-app language picker (the language follows the OS, including the per-app language setting on iOS and Android 13+), and runs on Hermes. It needs: the OS preferred-locale list and device country; cardinal plurals including Russian's one/few/many; locale-aware date formatting; and a guarantee that every locale provides every key.

Hermes does not reliably ship `Intl.PluralRules`, which modern i18n frameworks rely on for plurals — i18next v21+ uses it for plural suffix resolution and documents a polyfill for environments without it ([i18next: Plurals](https://www.i18next.com/translation-function/plurals)). Hermes does implement `Intl.DateTimeFormat` on both platforms ([Hermes: Intl APIs](https://github.com/facebook/hermes/blob/main/doc/IntlAPIs.md)).

## Decision
Build `src/shared/i18n/` as a small typed module and use `react-native-localize` only to read the OS locale list and country:

- **Locale data** — plain TS objects; `locales/en.ts` defines the `Translations` shape and every other locale is typed against it, so a missing or extra key fails `npm run typecheck`. `t()` keys are typed as the dotted leaf paths of that shape.
- **Plurals** — hand-written CLDR cardinal rules for en, de, fr and ru in `plural.ts`, unit-tested against CLDR samples ([Unicode CLDR: Language Plural Rules](https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html)).
- **Dates** — `Intl.DateTimeFormat` with `dateStyle: 'medium', timeStyle: 'short'` and an explicit-fields fallback if a Hermes build rejects those options.
- **Resolution** — walk the OS preferred-locale list and take the first supported language, else English, so the JS UI agrees with the language the OS picks for native resources (amendment on #80).
- **Locale source** — `react-native-localize` for `getLocales()`/`getCountry()`; it reflects per-app language settings and ships a Jest mock ([react-native-localize README](https://github.com/zoontek/react-native-localize#readme)).

Revisit if the string count grows by an order of magnitude, if ICU MessageFormat features (select/gender, nested plurals) become necessary, or if an in-app language picker is added.

## Alternatives considered
| Option | Why not chosen |
|---|---|
| `i18next` + `react-i18next` | Two dependencies plus an `Intl.PluralRules` polyfill stack for Hermes, for ~50 strings with no runtime language switching; untyped keys by default |
| `react-intl` / FormatJS | Same `Intl.PluralRules` polyfill requirement on Hermes; ICU MessageFormat is more than this app's strings need |
| `expo-localization` for locale detection | Pulls Expo modules into a bare React Native CLI project — the same reason `@expo/vector-icons` was rejected (`docs/ARCHITECTURE.md`) |
| `I18nManager.getConstants().localeIdentifier` | A single identifier with no preference list or country, and unreliable for Android's per-app locale |
| Resolve from the top OS locale only | Diverges from the language iOS/Android choose for native resources (e.g. preferred `[ja, de]` → English UI but German home-screen name) |

## Related ticket
#80

## Date
2026-09-24
