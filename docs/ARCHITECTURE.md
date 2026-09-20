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
│   ├── RootNavigator.tsx      # Native-stack routes: Home, ChecklistDetail, Run, RunHistory
│   └── ExternalRunLinkCoordinator.tsx # Incoming external-run URLs → hydrated app state + navigation
├── features/
│   ├── checklists/
│   │   ├── domain/
│   │   │   ├── models.ts           # Checklist, Item types + pure helpers (reordering)
│   │   │   └── checklistRepository.ts   # Repository interface
│   │   ├── data/
│   │   │   └── asyncStorageChecklistRepository.ts
│   │   ├── ui/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── ChecklistDetailScreen.tsx
│   │   │   └── components/         # ChecklistListItem, ItemRow, ...
│   │   └── useChecklists.ts        # Context + hook exposing checklist state to UI
│   └── runs/
│       ├── domain/
│       │   ├── models.ts           # ChecklistRun, RunOrigin, RunHistoryEntry, RunItem + pure helpers
│       │   ├── externalRunLinks.ts # Pure incoming-link parsing and callback-result construction
│       │   └── runRepository.ts    # Completed-run history persistence interface
│       ├── data/
│       │   └── asyncStorageRunRepository.ts
│       ├── ui/
│       │   ├── RunScreen.tsx
│       │   ├── RunHistoryScreen.tsx
│       │   └── components/         # RunItemRow
│       └── useRuns.tsx             # Context + hook for ephemeral active run + durable completed history
└── shared/
    ├── storage/
    │   └── jsonStorage.ts          # Thin typed wrapper over AsyncStorage (get/set JSON by key)
    ├── theme/
    │   └── colors.ts               # Single source of truth for the app's light-blue color palette
    └── ui/                         # Cross-feature presentational components
        └── IconButton.tsx          # Shared icon-only action button (Pressable + vector icon glyph)

test/
└── features/                       # Mirrors src/features/
    ├── checklists/
    └── runs/
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
copied into completed-run history. `ExternalRunLinkCoordinator` is the only
cross-feature coordinator: it waits for checklist hydration and navigation
readiness, resolves an incoming checklist ID, and asks `useRuns` to replace the
active run. This keeps checklist state out of `runs/ui` and keeps URL parsing
rules in plain TypeScript domain helpers.

## External app integration

The app accepts `checklister://run` URLs on iOS and Android. Native URL
registration forwards both cold-start and foreground URLs to React Native's
`Linking` boundary; no third-party linking SDK or backend is involved.
iOS uses a scene delegate so cold URLs become React Native launch options and
foreground URLs wait in memory until the JavaScript listener is installed.
Android retains the latest delivered intent so React Native can recover it if
the bridge is still starting, then clears that intent after JavaScript captures
it. These handoffs avoid losing or replaying a URL during the native-to-
JavaScript lifecycle transition without persisting callback data.

Incoming URLs are syntactically validated before they may replace a run.
Completed, cancelled, and error results are returned by opening the caller's
validated callback URL. Callback URLs and query values are treated as
sensitive boundary data: they remain ephemeral and must never be persisted or
sent to analytics.

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

## Local simulator scenarios

`.maestro/` contains three local iOS scenarios for completing a run,
confirming/discarding an exit, and confirming swipe-back without breaking navigation.
Shared fixture flows live in `.maestro/helpers/`. `scripts/scenarios-ios.sh` validates
an explicitly selected simulator and invokes the developer-installed Maestro CLI;
it is not an application dependency. Run with `npm run scenarios:ios -- <UDID>`.
See [SCENARIOS.md](SCENARIOS.md) for Java/Maestro setup, build/install steps,
fixture isolation and failure artifacts. Jest remains the unit/component test suite.
