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
  `react-native-reanimated`) — drag-to-reorder for items and sections. Not
  yet installed — add it when implementing Feature 3.
- `react-native-safe-area-context` — already installed; also a peer
  dependency of React Navigation.
- [`@testing-library/react-native`](https://callstack.github.io/react-native-testing-library/) —
  dev dependency for hook and screen tests. Installed.
