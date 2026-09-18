# Code Style

This document defines the coding practices for CheckLister's TypeScript and
React Native code. ESLint, TypeScript, and Prettier enforce the mechanical
parts; this guide covers design choices that tools cannot fully judge.

When a recurring code smell is discovered, add it to the catalogue below so
future changes can recognize and avoid it.

## General principles

- Optimize for clarity before cleverness. Prefer code whose intent is visible
  without knowing a JavaScript idiom.
- Keep changes small and cohesive. A function, component, or commit should have
  one clear reason to change.
- Make invalid states difficult to represent with types and domain helpers.
- Keep business rules independent of React Native, storage, and navigation.
- Preserve the existing formatting of documentation. Do not run Prettier over
  Markdown files unless the change explicitly calls for reformatting them.

## TypeScript

- Use explicit types at module boundaries: component props, context values,
  repository interfaces, navigation parameters, and exported functions.
- Let TypeScript infer obvious local types; avoid annotations that only repeat
  the initializer.
- Prefer `unknown` plus narrowing over `any`. If `any` is unavoidable at an
  external boundary, contain it and explain why.
- Prefer discriminated unions for state with mutually exclusive cases.
- Prefer `Boolean(value)` to implicit boolean coercion such as `!!value`.
- Use `===` and `!==`; do not rely on coercive equality.
- Avoid non-null assertions (`!`) and broad type assertions (`as SomeType`).
  Narrow, validate, or redesign the type instead.
- Use `readonly` for values that callers must not mutate.
- Give constants and helpers names that express domain meaning. Avoid magic
  strings and numbers in behavior code.
- Treat dates crossing persistence boundaries as ISO strings and parse them at
  a deliberate boundary.

## Functions and naming

- Use verbs for actions (`saveRun`) and nouns or adjectives for values
  (`completedRuns`, `isComplete`).
- Keep functions at one level of abstraction. Extract domain decisions from UI
  event handlers.
- Prefer early returns over deeply nested conditionals.
- Avoid boolean parameters when their meaning is unclear at the call site;
  prefer named options or separate functions.
- Do not use a comment to compensate for unclear code. Improve the name or
  structure first; reserve comments for constraints, intent, and non-obvious
  trade-offs.

## React and React Native

- Use function components and hooks.
- Keep render functions declarative. Put persistence, analytics, and navigation
  decisions in named handlers or hooks.
- Do not copy props or derived values into state. Compute them during render or
  memoize only when measurement shows a need.
- Use effects only to synchronize with an external system. Do not use an effect
  for a value that can be calculated directly.
- Declare complete hook dependency lists. If an exception is intentional,
  document the lifecycle reason next to the suppression.
- Use stable domain identifiers as list keys; never use an array index when
  items can be inserted, removed, or reordered.
- Use shared theme tokens and shared UI components instead of duplicating
  colors, spacing conventions, or icon behavior.
- Every interactive control must expose an accessibility role and meaningful
  label. Disabled state must also be exposed to accessibility APIs.
- Verify navigation behavior on a real simulator when native gestures, headers,
  alerts, or platform-specific presentation are involved.
- Keep platform-specific branches narrow and document the native constraint
  that requires them.

## State, persistence, and errors

- Keep one authoritative source for each piece of state. Avoid mirrored state
  that can drift out of sync.
- Treat state loading and mutation as concurrent operations. Cover races where
  a write can occur before the initial read finishes.
- Persist required data before presenting an operation as successful. If an
  optimistic update is necessary, provide rollback or explicit recovery.
- Never swallow a persistence or domain error that would make the UI report a
  false success. Preserve recoverable user state and show an actionable error.
- Multiple writes that form one user action must be atomic, compensating, or
  explicitly best-effort.
- Do not mutate reducer state, props, or persisted snapshots in place.
- Store immutable run history independently from mutable checklist templates.

## Architecture

- Domain modules contain plain TypeScript and must not import React, React
  Native, navigation, or storage implementations.
- Data modules implement domain repository interfaces and own serialization and
  storage keys.
- UI consumes repositories through feature hooks/providers. Screens must not
  construct storage implementations directly.
- Follow the dependency directions in `docs/ARCHITECTURE.md`; do not introduce
  a reverse cross-feature dependency for convenience.
- Create repository instances at the composition root so production and tests
  can inject different implementations.

## Testing

- Test observable behavior rather than implementation details.
- Unit-test pure domain rules and serialization boundaries.
- Component tests should use user-facing labels, text, roles, and interactions.
- Cover loading, empty, success, failure, retry, and relevant concurrency paths.
- Every fixed regression needs a test that fails without the fix.
- Use Maestro for critical installed-app flows involving native navigation or
  gestures. Keep fixtures isolated and do not hide failures with optional
  assertions or arbitrary sleeps.

## Code-smell catalogue

Treat these as review prompts, not automatic proof that code is wrong. If one is
necessary, keep it local and document the reason.

### Type and language smells

- `!!value` or other implicit coercion where `Boolean(value)` is clearer.
- `any`, repeated type assertions, or non-null assertions used to silence a
  modeling problem.
- Stringly typed states that should be a union or enum-like constant.
- Magic strings, numbers, storage keys, route names, or analytics names repeated
  across files.
- A boolean argument whose meaning is not obvious at the call site.
- Mutable shared objects or arrays.

### Function and component smells

- A long function or component mixing rendering, business rules, persistence,
  analytics, and navigation.
- Deep nesting that obscures the main path.
- Duplicate conditionals or transformations in multiple screens.
- A component with many unrelated state variables or effects.
- Props passed through several layers only to reach one descendant; consider a
  focused composition or feature context, not a broad global store by default.
- Premature memoization that adds dependencies without measured benefit.

### React Native smells

- Array-index list keys for editable or reorderable data.
- Interactive `Pressable` elements without accessibility metadata.
- Hard-coded colors or platform dimensions outside the theme/layout system.
- Assuming a JavaScript navigation callback fully describes native gesture
  behavior without simulator coverage.
- Large platform forks where a small platform adapter would isolate the
  difference.
- Nested virtualized lists or unbounded rendering without considering mobile
  memory and interaction performance.

### State and async smells

- The same fact stored in two states and synchronized by effects.
- A write racing initial hydration.
- Dispatching success before required persistence completes.
- Catching an error only to log it while the UI proceeds as if the operation
  succeeded.
- Independent writes that can leave a partially completed user action.
- An async callback using stale captured state when a ref, reducer action, or
  functional update should establish ordering.

### Architecture smells

- Domain code importing React Native or storage APIs.
- A screen instantiating a concrete repository.
- Data-layer code importing UI code.
- Circular or reverse feature dependencies.
- Business rules duplicated in event handlers instead of domain helpers.
- A shared utility that actually contains one feature's policy.

### Test smells

- Tests coupled to component internals, hook call order, or styling structure.
- Snapshot tests used in place of behavioral assertions.
- Happy-path-only coverage for persistence or async workflows.
- Arbitrary sleeps, optional assertions, or retries that can conceal a defect.
- Mocks that cannot reproduce the failure or timing behavior of the real
  boundary.
- A regression fix without a test demonstrating the previous failure.
