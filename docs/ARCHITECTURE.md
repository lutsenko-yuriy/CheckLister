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
    ├── links/
    │   └── externalLinkUrls.ts     # Verb-agnostic URL primitives + parseExternalLinkKind('run' | 'select' | null)
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

`.maestro/` contains local iOS scenarios for completing a run,
confirming/discarding an exit, confirming swipe-back without breaking navigation,
completed-run history, and cold/foreground external-run link handling.
Shared fixture flows live in `.maestro/helpers/`. `scripts/scenarios-ios.sh` validates
an explicitly selected simulator and invokes the developer-installed Maestro CLI;
it is not an application dependency. Run with `npm run scenarios:ios -- <UDID>`.
See [SCENARIOS.md](SCENARIOS.md) for Java/Maestro setup, build/install steps,
fixture isolation and failure artifacts. Jest remains the unit/component test suite.
