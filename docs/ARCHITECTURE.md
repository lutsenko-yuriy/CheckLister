# Architecture

<!-- Describe how the code is organised.
     The Tech Lead and Developer agents read this file before planning or implementing work.
     Keep it accurate — update it whenever the structure changes. -->

## Overview

Feature-based modules with React Navigation and local persistence. Two
feature modules: `checklists` (templates and their items) and `runs`
(checklist runs and history). No backend — every repository persists to
on-device `AsyncStorage` as JSON.

## Directory structure

```
App.tsx                        # Composition root: providers + RootNavigator
index.js                       # RN entry point, registers App

src/
├── navigation/
│   └── RootNavigator.tsx      # Native-stack routes: Home, ChecklistDetail, Run, History
├── features/
│   ├── checklists/
│   │   ├── domain/
│   │   │   ├── models.ts           # Checklist, Section, Item types + pure helpers
│   │   │   │                       # (ordering/reordering, section add/delete,
│   │   │   │                       #  legacy-data normalization — see below)
│   │   │   └── checklistRepository.ts   # Repository interface
│   │   ├── data/
│   │   │   └── asyncStorageChecklistRepository.ts
│   │   ├── ui/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── ChecklistDetailScreen.tsx
│   │   │   └── components/         # ChecklistListItem, ItemRow, SectionHeader, ...
│   │   └── useChecklists.ts        # Context + hook exposing checklist state to UI
│   └── runs/
│       ├── domain/
│       │   ├── models.ts           # ChecklistRun, RunItem + pure helpers (e.g. isRunComplete)
│       │   └── runRepository.ts    # Repository interface
│       ├── data/
│       │   └── asyncStorageRunRepository.ts
│       ├── ui/
│       │   ├── RunScreen.tsx
│       │   ├── HistoryScreen.tsx
│       │   └── components/         # RunItemRow, HistoryListItem, ...
│       └── useRuns.ts              # Context + hook exposing run state to UI
└── shared/
    ├── storage/
    │   └── jsonStorage.ts          # Thin typed wrapper over AsyncStorage (get/set JSON by key)
    └── ui/                         # Cross-feature presentational components (Button, ConfirmDialog, EmptyState, ...)

test/
└── features/                       # Mirrors src/features/
    ├── checklists/
    └── runs/
```

## Layers

Each feature module (`checklists`, `runs`) is a vertical slice with its own
domain/data/ui layers, matching the directory structure above.

### Domain
Plain TypeScript: types and pure functions only (e.g. `isChecklistFullyChecked`,
`isRunComplete`, `snapshotChecklistIntoRun`). No React, no React Native, no
`AsyncStorage` imports. Defines the repository *interface* for its feature
(e.g. `ChecklistRepository`) that the data layer implements. May be imported
by that feature's own `data/` and `ui/` layers.

**Cross-feature rule:** `runs/domain` may import types from `checklists/domain`
(a run is built from a checklist snapshot). `checklists/domain` must never
import from `runs/*` — the dependency is one-directional.

**Sections (CheL-3):** `Checklist.sections` holds only user-named sections,
in display order. The default/unnamed section has no entry in `sections` —
it is implicit, represented by `Item.sectionId === null`, always renders
first, and cannot be renamed, reordered, or deleted. `Checklist.items`
stays one flat array, always persisted in canonical display order (default
section's items, then each named section's items in `sections` order);
`normalizeChecklist` enforces this invariant and is applied on every read
and after every mutation.

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
hook (`useChecklists`, `useRuns`) backed by `useReducer`, initialized from
its repository on mount and persisting on every mutation. Revisit if
cross-feature state coordination outgrows this.

## Dependencies

- [React Navigation](https://reactnavigation.org/) (`@react-navigation/native` +
  `@react-navigation/native-stack`, with `react-native-screens` as a peer
  dependency) — screen navigation (Home → ChecklistDetail → Run, plus
  History). Installed.
- [`@react-native-async-storage/async-storage`](https://react-native-async-storage.github.io/async-storage/) —
  local, on-device persistence for checklists and run history. Installed.
- [`react-native-draggable-flatlist`](https://github.com/computerjazz/react-native-draggable-flatlist)
  (with its peer deps `react-native-gesture-handler` and
  `react-native-reanimated`) — drag-to-reorder for items and sections
  (Feature 3 / CheL-3). Requires `GestureHandlerRootView` wrapping the app
  root, `react-native-reanimated/plugin` as the last entry in
  `babel.config.js`, and Jest transform/mocking setup for all three
  packages. **Pinned to `react-native-reanimated@3.19.5`** —
  `react-native-draggable-flatlist@4.0.3` (the latest published version)
  hasn't been updated for Reanimated 4's `react-native-worklets` split and
  throws `[Worklets] runOnUI can only be used with worklets` at runtime
  against Reanimated 4.x. `metro.config.js` redirects
  `react-native/Libraries/Renderer/shims/ReactNative` (removed in this RN
  version, which is New Architecture/Fabric-only) to the Fabric shim purely
  so Metro can statically resolve a dead code path inside Reanimated 3.x's
  `findHostInstance` — revisit both the pin and the redirect together if
  either dependency is ever upgraded.
- `react-native-safe-area-context` — already installed; also a peer
  dependency of React Navigation.
- [`@testing-library/react-native`](https://callstack.github.io/react-native-testing-library/) —
  dev dependency for hook and screen tests. Installed.
