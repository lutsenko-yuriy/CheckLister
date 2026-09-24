# Architecture

<!-- Describe how the code is organised.
     The Tech Lead and Developer agents read this file before planning or implementing work.
     Keep it accurate — update it whenever the structure changes. -->

## Overview

Feature-based modules with React Navigation and local persistence. Two
feature modules: `checklists` (templates and their items) and `runs`
(active checklist runs plus completed-run history). No backend — every
repository persists to on-device `AsyncStorage` as JSON.

## Directory structure

```
App.tsx                        # Composition root: providers + RootNavigator
index.js                       # RN entry point, registers App

src/
├── navigation/
│   ├── RootNavigator.tsx      # Native-stack routes: Home, ChecklistDetail, Run, RunHistory, ChecklistSelect
│   ├── ExternalLinkCoordinator.tsx # Incoming external-link URLs → dispatch by verb (run, select)
│   ├── useExternalLinkQueue.ts     # Shared URL queue/bootstrap: Linking listener, getInitialURL, native drain, dedupe
│   └── externalLinkNativeHandoff.ts # Native pending-URL handoff (module name: ExternalRunLinking, predates `select`)
├── features/
│   ├── checklists/
│   │   ├── domain/
│   │   │   ├── models.ts           # Checklist, Item types + pure helpers (reordering)
│   │   │   ├── checklistRepository.ts   # Repository interface
│   │   │   └── externalSelectLinks.ts   # Pure incoming-select-link parsing and callback-result construction
│   │   ├── data/
│   │   │   └── asyncStorageChecklistRepository.ts
│   │   ├── ui/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── ChecklistDetailScreen.tsx
│   │   │   ├── ChecklistSelectScreen.tsx   # Read-only external picker (route ChecklistSelect)
│   │   │   └── components/         # ChecklistSummaryRow (shared by HomeScreen and the picker), ItemRow, ...
│   │   ├── useChecklists.ts        # Context + hook exposing checklist state to UI
│   │   ├── useExternalSelection.tsx        # Ephemeral, in-memory pending-callback-URL session for the picker
│   │   └── externalSelectCallbackDelivery.ts # Opens the caller's callback URL / alerts on failure
│   └── runs/
│       ├── domain/
│       │   ├── models.ts           # ChecklistRun, RunOrigin, RunHistoryEntry, RunItem + pure helpers
│       │   ├── externalRunLinks.ts # Run-specific request/result types, built on shared/links primitives
│       │   └── runRepository.ts    # Completed-run history persistence interface
│       ├── data/
│       │   └── asyncStorageRunRepository.ts
│       ├── ui/
│       │   ├── RunScreen.tsx
│       │   ├── RunHistoryScreen.tsx
│       │   └── components/         # RunItemRow
│       └── useRuns.tsx             # Context + hook for ephemeral active run + durable completed history
└── shared/
    ├── i18n/                       # Localization — en, de, fr, ru (#80)
    │   ├── languages.ts            # SUPPORTED_LANGUAGES / AppLanguage — single source of truth
    │   ├── resolveLanguage.ts      # Pure: OS preferred locales + country → { appLanguage, requestedLanguage, region? }
    │   ├── plural.ts               # Hand-written CLDR cardinal plural rules for the supported languages
    │   ├── translate.ts            # Pure lookup, {{param}} interpolation, plural selection, Intl date formatting
    │   ├── useI18n.tsx             # I18nProvider + useI18n(): { language, t, formatDateTime }
    │   ├── useLanguageAnalytics.ts # Emits app_language_resolved once per session / on change
    │   └── locales/                # en.ts (defines the Translations shape), de.ts, fr.ts, ru.ts
    ├── links/
    │   └── externalLinkUrls.ts     # Verb-agnostic URL primitives + parseExternalLinkKind('run' | 'select' | null)
    ├── storage/
    │   └── jsonStorage.ts          # Thin typed wrapper over AsyncStorage (get/set JSON by key)
    ├── theme/
    │   ├── palette.ts              # Palette type + lightPalette/darkPalette (CheL-70)
    │   ├── useTheme.tsx            # ThemeProvider + useTheme(): resolved OS scheme + active palette (CheL-70)
    │   ├── createThemedStyles.ts   # useStyles() factory: builds a screen's StyleSheet from the active palette, cached per palette (CheL-70)
    │   └── useColorSchemeAnalytics.ts # Emits color_scheme_resolved once per resolved/changed scheme (CheL-70)
    └── ui/                         # Cross-feature presentational components
        └── IconButton.tsx          # Shared icon-only action button (Pressable + vector icon glyph)

test/
└── features/                       # Mirrors src/features/
    ├── checklists/
    └── runs/

assets/
└── icon/
    └── icon.svg                    # App icon master; every platform icon PNG is generated from it
```

## Layers

Each feature module (`checklists`, `runs`) is a vertical slice with its own
domain/data/ui layers, matching the directory structure above.

### Domain

Plain TypeScript: types and pure functions only (e.g. `isRunComplete`,
`startRun`). No React, no React Native, no
`AsyncStorage` imports. Defines the repository _interface_ for its feature
(e.g. `ChecklistRepository` or `RunRepository`) that the data layer
implements. May be imported by that feature's own `data/` and `ui/` layers.

**Cross-feature rule:** `runs/domain` may import types from `checklists/domain`
(a run is built from a checklist snapshot). `checklists/domain` must never
import from `runs/*` — the dependency is one-directional at the domain layer.
The generic, verb-agnostic URL primitives both `runs/domain/externalRunLinks.ts`
and `checklists/domain/externalSelectLinks.ts` need (`parseAbsoluteUrl`,
`isSupportedCallbackUrl`, `applyCallbackParams`, `parseExternalLinkKind`, …)
live in `shared/links/externalLinkUrls.ts` instead of either feature's
`domain/`, so the checklists side never has to import from `runs/*` to reuse
them (CheL-40).

At the UI layer the dependency runs the other way: `ChecklistDetailScreen`
(in `checklists/ui`) imports `useRuns` from `runs/useRuns` to power its
"Start run" button (CheL-4 WU3) — the entry point into a run necessarily
lives on the checklist screen. `runs/ui` must never import from
`checklists/ui` or `checklists/useChecklists` in the other direction.

### Data

Implements the domain layer's repository interface using `AsyncStorage` (via
`shared/storage/jsonStorage.ts`). Owns serialization and storage keys. May
import its own feature's `domain/` and `shared/`. Must not import from `ui/`
in any feature, and must not import another feature's `data/` layer directly.

### UI

React Native screens and components. Consumes state through the feature's
own hook (`useChecklists`, `useRuns`) rather than instantiating repositories
directly. Repository instances are created once and wired into each
feature's context provider at the composition root (`App.tsx`), which is the
only place `data/` implementations are constructed.

**Theming (CheL-70):** screens obtain colors and styles through
`shared/theme/createThemedStyles.ts`'s `useStyles()` factory — never a
module-level `StyleSheet.create` closed over a static palette. The factory
reads the active palette from `useTheme()` (`shared/theme/useTheme.tsx`),
which resolves the OS appearance via React Native's `useColorScheme()` and
falls back to light when no `ThemeProvider` is mounted (e.g. in tests that
render a screen in isolation). `shared/theme/palette.ts` is the single
source of truth for both the light and dark token sets.

**Localization (#80):** every app-provided string is rendered through `t()`
from `shared/i18n/useI18n.tsx` — no user-facing string literals in UI code
outside `shared/i18n/locales/`. User content (checklist titles, item text,
history snapshots) is only ever an interpolated parameter, never a
translation key. Modules that must stay React-free (e.g. the callback
delivery helpers) take already-translated messages as arguments. Like
`useTheme`, `useI18n` falls back to English when no `I18nProvider` is mounted,
so screens rendered in isolation in tests keep their English text.

The UI language follows the OS; there is no in-app picker.
`resolveLanguage` walks the OS preferred-locale list (which already reflects
the per-app language on iOS and Android 13+) and picks the first entry whose
bare language code is in `SUPPORTED_LANGUAGES`; if none matches, English.
Walking the list keeps the JS UI consistent with the language iOS/Android pick
for native resources (the home-screen app name). `requestedLanguage` is the
bare code of the *top* preferred locale, so analytics can see demand for
unsupported languages. `region` is the device country (`getCountry()`),
kept only when it is a two-letter ISO 3166-1 code and otherwise omitted, so a
malformed value can never produce an invalid `Intl` locale tag. Values returned to other apps through callback URLs
(status, IDs, names) are language-independent and must never be translated.

Locale files are plain typed TS objects: `en.ts` defines the `Translations`
shape and the other locales are typed against it, so a missing or extra key
fails `npm run typecheck`; `t()` keys are typed as the dotted leaf paths of
`Translations`. A plural entry is an object `{ one?, few?, many?, other }`
(so `other` is reserved for plural leaves); a category a language omits
falls back to `other`. Plural rules are hand-written in `plural.ts`
rather than relying on Hermes' `Intl.PluralRules`; dates use
`Intl.DateTimeFormat` with `dateStyle`/`timeStyle`, falling back to
explicit fields if a Hermes build rejects those options.
`shared/i18n/locales/locales.test.ts` checks every non-English locale against
`en.ts`: identical key set, preserved `{{placeholder}}`s, no empty or
English-identical values (besides the allowlisted app name), and every
plural category `pluralCategory` can return for that language. The app
display name is localized natively
(`ios/CheckLister/*.lproj/InfoPlist.strings`,
`android/app/src/main/res/values-*/strings.xml`): "CheckLister" for en/de/fr,
"ЧекЛистер" for ru. The supported set is also declared natively
(`CFBundleLocalizations` in `Info.plist`, `res/xml/locales_config.xml` via
`android:localeConfig`), and a Jest drift test keeps those in sync with
`SUPPORTED_LANGUAGES`.

`MainActivity` declares `locale|layoutDirection` in `android:configChanges`
(alongside `uiMode`): without it an Android language change recreates the
activity, remounting the React root and silently dropping the in-memory active
run and any pending external-selection callback. `I18nProvider` re-resolves
on `AppState` → `active` instead (an equal resolution keeps the previous
state object, so consumers don't re-render). iOS relaunches the process on a
per-app language change, which is accepted.

`useLanguageAnalytics` dedupes `app_language_resolved` on the full
(`app_language`, `requested_language`, `region`) tuple held in a
**module-level** variable rather than a `useRef` (unlike
`useColorSchemeAnalytics`): a React root remount or Android activity
recreation keeps the JS module alive and must not re-log, while a genuinely
new session (fresh JS context) starts clean. Tests reset it with
`resetLanguageAnalyticsForTesting()`. Jest maps `react-native-localize` to
the library's own `react-native-localize/mock/jest` (`jest.config.js`).

### State management

No external state library for v1. Each feature exposes a React Context +
hook (`useChecklists`, `useRuns`) backed by `useReducer`. `useChecklists` is
initialized from its repository on mount and persists on every mutation.
`useRuns` keeps the single `activeRun` in memory because an unfinished run
cannot be paused or resumed. It loads and persists immutable
`RunHistoryEntry` summaries through `RunRepository`; completed history is
therefore durable and independent of checklist deletion. Revisit state
management itself if cross-feature coordination outgrows this.

An active run also carries a discriminated local or external origin. External
origin metadata, including its callback URL, remains in memory and is never
copied into completed-run history. A checklist selection request carries no
durable state at all: `useExternalSelection`'s pending callback URL lives only
in a React ref/state pair, never in navigation params (which are part of
serializable navigation state) and never in `AsyncStorage`. `ExternalLinkCoordinator`
is the only cross-feature coordinator — one component must own the whole
incoming-URL queue (the `Linking` listener, `getInitialURL()`, the native
pending-URL drain, and the cross-channel dedupe), since a second parallel
coordinator would double-handle every URL. It waits for checklist hydration and
navigation readiness, then dispatches each URL by verb
(`shared/links/parseExternalLinkKind`):
- `run` (CheL-36): resolves an incoming checklist ID and asks `useRuns` to
  replace the active run.
- `select` (CheL-40): asks `useExternalSelection` to begin a selection session
  and pushes the read-only `ChecklistSelectScreen` above whatever is on
  screen — including an active run, which it never touches. If a run link
  arrives while a picker is open, the pending selection is resolved
  `cancelled` and the picker is popped before the run starts; if a second
  select link arrives while a picker is open, the first caller is resolved
  `cancelled` and the picker is re-pointed at the new callback instead of a
  second picker being pushed. A URL matching neither verb keeps CheL-36's
  existing `invalid_callback` handling rather than a new verb-agnostic event.

This keeps checklist state out of `runs/ui`, keeps run state out of
`checklists/ui`, and keeps URL parsing rules in plain TypeScript domain
helpers.

## External app integration

The app accepts `checklister://run` and `checklister://select` URLs on iOS and
Android. Native URL registration forwards both cold-start and foreground URLs
to React Native's `Linking` boundary; no third-party linking SDK or backend is
involved. iOS uses a scene delegate so cold URLs become React Native launch
options and foreground URLs wait in memory until the JavaScript listener is
installed. Android retains the latest delivered intent so React Native can
recover it if the bridge is still starting, then clears that intent after
JavaScript captures it — `Intent.isExternalLinkIntent()` accepts either host so
a cold `select` link is retained the same way a `run` link is. These handoffs
avoid losing or replaying a URL during the native-to-JavaScript lifecycle
transition without persisting callback data. The native module backing this
handoff is still named `ExternalRunLinking`; the name predates the `select`
verb and renaming it would churn native files for no behavioural gain (see
`externalLinkNativeHandoff.ts`).

Incoming URLs are syntactically validated before they may replace a run or
open the picker. Completed, cancelled, and error results are returned by
opening the caller's validated callback URL. Callback URLs and query values —
and, for a selection result, the chosen checklist's ID and name — are treated
as sensitive boundary data: they remain ephemeral and must never be persisted
or sent to analytics.

## Dependencies

- [React Navigation](https://reactnavigation.org/) (`@react-navigation/native` +
  `@react-navigation/native-stack`, with `react-native-screens` as a peer
  dependency) — screen navigation (Home → ChecklistDetail → Run, plus
  History). Installed.
- [`@react-native-async-storage/async-storage`](https://react-native-async-storage.github.io/async-storage/) —
  local, on-device persistence for checklists and run history. Installed.
- [`react-native-reanimated-dnd`](https://github.com/entropyconquers/react-native-reanimated-dnd)
  (with its peer deps `react-native-gesture-handler`, `react-native-reanimated`,
  and `react-native-worklets`) — drag-to-reorder for checklist items
  (Feature 3), via its `Sortable`/`SortableItem`/`SortableItem.Handle`
  components, rendering `checklist.items` directly. Requires
  `GestureHandlerRootView` wrapping the app root and
  `react-native-reanimated/plugin` as the last entry in `babel.config.js`.
  Chosen over `react-native-draggable-flatlist` (tried first): that library's
  compiled worklets predate Reanimated 4's `react-native-worklets` split and
  throw `[Worklets] runOnUI can only be used with worklets` at runtime;
  `react-native-reanimated-dnd` explicitly targets Reanimated 4 + worklets.
  Patched via [`patch-package`](https://github.com/ds300/patch-package)
  (`patches/react-native-reanimated-dnd+2.0.0.patch`, applied on
  `postinstall`) to thread a `keyboardShouldPersistTaps` prop through
  `Sortable` to its internal `FlatList`/`ScrollView`, since the library
  doesn't expose one — needed so a checklist item's Save/Cancel buttons
  respond on the first tap while its draft `TextInput` is still focused
  (CheL-54). Re-diff with `npx patch-package react-native-reanimated-dnd`
  after any upgrade of this dependency.
- `react-native-safe-area-context` — already installed; also a peer
  dependency of React Navigation.
- [`@testing-library/react-native`](https://callstack.github.io/react-native-testing-library/) —
  dev dependency for hook and screen tests. Installed.
- [`react-native-vector-icons`](https://github.com/oblador/react-native-vector-icons) —
  icon-only action buttons (CheL-14). Chosen over `@expo/vector-icons` since this
  is a bare React Native CLI project, not Expo-managed. Uses the bundled
  `MaterialIcons` font only. The package's own podspec (`s.resources =
"Fonts/*.ttf"`) and `fonts.gradle` (applied from `android/app/build.gradle`)
  already bundle every font file — do not also add the font manually via
  `react-native.config.js`/`react-native-asset`, that duplicates the same file
  into the iOS bundle and breaks the build ("Multiple commands produce
  MaterialIcons.ttf"). iOS still needs the font declared in
  `ios/CheckLister/Info.plist`'s `UIAppFonts` so it's registered at runtime;
  run `pod install` after adding the dependency.

- [`react-native-localize`](https://github.com/zoontek/react-native-localize) —
  reads the OS preferred-locale list and device country for localization (#80).
  Chosen over `expo-localization` (bare CLI project, same reason as
  `@expo/vector-icons` above) and over `I18nManager`'s single
  `localeIdentifier` (no preference list or country; unreliable for the
  Android per-app locale). Deliberately **no** i18n framework (`i18next` /
  `react-i18next`): ~50 strings in 4 languages with no in-app switching don't
  justify two dependencies plus an `Intl.PluralRules` polyfill for Hermes; see
  `shared/i18n/`. Run `pod install` after adding the dependency.

## Local simulator scenarios

`.maestro/` contains local iOS scenarios for completing a run,
confirming/discarding an exit, confirming swipe-back without breaking navigation,
completed-run history, and cold/foreground external-run link handling.
Shared fixture flows live in `.maestro/helpers/`. `scripts/scenarios-ios.sh` validates
an explicitly selected simulator and invokes the developer-installed Maestro CLI;
it is not an application dependency. Run with `npm run scenarios:ios -- <UDID>`.
See [SCENARIOS.md](SCENARIOS.md) for Java/Maestro setup, build/install steps,
fixture isolation and failure artifacts. Jest remains the unit/component test suite.

## App icon

`assets/icon/icon.svg` is the only hand-edited icon file. `scripts/generate_icons.py`
renders everything else from it: the iOS `AppIcon.appiconset` (see below), the Android
adaptive-icon foreground (`mipmap-*/ic_launcher_foreground.png`, also used as the
themed-icon monochrome layer), and the legacy `ic_launcher` / `ic_launcher_round` PNGs
for API < 26. The adaptive background is `drawable/ic_launcher_background.xml`, which
repeats the SVG's gradient colours. Never edit the generated PNGs or `Contents.json`
by hand. Edit the SVG, then run
`pip install cairosvg pillow && python3 scripts/generate_icons.py` and commit the output.
The script finds the SVG layers by element id (`background`, `art`, `box`, `halo`, `check`),
and `scripts/tests/test_generate_icons.py` checks that those ids are present.

`AppIcon.appiconset` is in Xcode's **Single Size** mode: `Contents.json` has exactly two
entries, both `1024x1024` with no `scale` key (that absence is what selects Single Size —
Xcode derives every smaller size from these two sources at build time, so no small
per-size PNGs are committed). The default entry (`icon-1024.png`) is the full-bleed,
opaque render. The dark-appearance entry (`icon-1024-dark.png`, tagged
`"appearances": [{"appearance": "luminosity", "value": "dark"}]`, CheL-77) is the same
transparent glyph used for Android's adaptive foreground — rendered via `foreground()`
at `art_scale=1.0` (full scale, not Android's 0.68 safe-zone scale) — since Apple's
guidance for dark-appearance icons is a transparent image with the system supplying its
own dark backdrop. A tinted-appearance entry is deliberately omitted; iOS derives a
tinted rendering from the default icon when none is supplied.

## Launch/splash screen (CheL-70)

Both platforms show the app icon's glyph (transparent background, not the
full opaque icon tile) centered directly on a background matching the active
theme's `colors.background` (light `#EAF2FB` / dark `#0E1724`, from
`shared/theme/palette.ts`) instead of the OS-templated default. This can't
read the JS palette at launch, so the colors are duplicated as native
resources kept in sync by hand, not generated:
- iOS: `ios/CheckLister/LaunchScreen.storyboard`, sourcing
  `Images.xcassets/LaunchLogo.imageset` (a copy of the Android adaptive
  icon's transparent foreground PNG — see "App icon" above) and the
  `LaunchBackground` named color (light/dark variants).
- Android: only the platform SplashScreen API (12+, API 31) is customized,
  via `values-v31/styles.xml`'s `android:windowSplashScreenBackground` /
  `windowSplashScreenAnimatedIcon` attributes on `AppTheme`, reusing the
  existing `@mipmap/ic_launcher_foreground` (already transparent-background)
  and a new `splashBackground` color resource (`values/colors.xml` +
  `values-night/colors.xml`). Below API 31 there is no system splash screen
  to customize, so those devices see the platform's own default blank
  launch, same as before this ticket.
