# Architecture

<!-- Describe how the code is organised.
     The Tech Lead and Developer agents read this file before planning or implementing work.
     Keep it accurate — update it whenever the structure changes. -->

## Overview

Feature-based modules with React Navigation and local persistence. Two
feature modules: `checklists` (templates and their items) and `runs`
(checklist runs; history is a planned follow-up, not yet built). No
backend — every repository persists to on-device `AsyncStorage` as JSON.

## Directory structure

```
App.tsx                        # Composition root: providers + RootNavigator
index.js                       # RN entry point, registers App

src/
├── navigation/
│   └── RootNavigator.tsx      # Native-stack routes: Home, ChecklistDetail, Run
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
│       │   └── models.ts           # ChecklistRun, RunItem + pure helpers (startRun, isRunComplete, ...)
│       ├── ui/
│       │   ├── RunScreen.tsx
│       │   └── components/         # RunItemRow
│       └── useRuns.tsx             # Context + hook exposing run state to UI (in-memory only, no repository yet)
└── shared/
    ├── storage/
    │   └── jsonStorage.ts          # Thin typed wrapper over AsyncStorage (get/set JSON by key)
    ├── theme/
    │   └── colors.ts               # Single source of truth for the app's light-blue color palette
    ├── config/
    │   └── featureFlags.ts         # Local kill-switches, e.g. { checklistRuns: true } (see Feature flags below)
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
`AsyncStorage` imports. Defines the repository *interface* for its feature
(e.g. `ChecklistRepository`) that the data layer implements, where the
feature has a data layer — `runs/domain` has none yet (see State management
below). May be imported by that feature's own `data/` and `ui/` layers.

**Cross-feature rule:** `runs/domain` may import types from `checklists/domain`
(a run is built from a checklist snapshot). `checklists/domain` must never
import from `runs/*` — the dependency is one-directional.

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
`useRuns` holds a single in-memory `activeRun` with no repository and no
persistence — a run cannot be paused/resumed, so there is nothing to durably
store yet. Durable run storage (and a `runRepository`) lands with the run
history feature. Revisit state management itself if cross-feature
coordination outgrows this.

## Feature flags

There is no backend and no remote-config service in this app (see
`docs/PRODUCT_SPEC.md` — out of scope for v1). A "kill-switch" is therefore a
local, hardcoded constant in `src/shared/config/featureFlags.ts`
(`FEATURE_FLAGS.checklistRuns`, default `true`), read by the UI to hide a new
entry point / route. Disabling a feature this way still requires a new
release (a patch bump flipping the constant to `false`), but keeps the
disable to a one-line diff rather than a revert of the whole feature.
Revisit if the app ever gains a real remote-config mechanism.

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
