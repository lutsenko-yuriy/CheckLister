# Changelog

A record of all versioned releases. For planned work and known issues, see @docs/BACKLOG.md.

---

<!-- This file is maintained by the Product Owner agent.
     New sections are prepended after each merged PR in the format:

## [X.Y.Z] — YYYY-MM-DD (PR #N merged)

### Added / Changed / Fixed
- ...
-->

## [Unreleased]

### [wip]
- CheL-4 WU3: Added a "Start run" button to `ChecklistDetailScreen` (disabled for an empty checklist), which starts a run and navigates to the Run screen — the run feature is now reachable from the UI. Fires `run_started` analytics. Also fixed a WU2 gap found during this WU's simulator smoke test: the Run screen's header back button and swipe-back gesture were both disabled to force exits through the "Are you sure?" confirmation, but on iOS (no hardware back key) that left no way to leave an incomplete run at all. Restoring the header back button alone wasn't enough either — a manual `beforeRemove` listener can't safely block the iOS swipe-back gesture (it pops the native screen as part of the gesture animation itself, independent of JS, causing a "removed natively but didn't get removed from JS state" desync). Switched to React Navigation's `usePreventRemove` hook, which disables the native gesture itself while a run is active and incomplete, and re-enables it once the run completes or is discarded.
- CheL-4 WU2: Added the run screen (`src/features/runs/ui/RunScreen.tsx`) with a `RunItemRow` component, registered the `Run` route (`src/navigation/types.ts`, `RootNavigator.tsx`) with its back button, header-left item, and swipe gesture all disabled, and wired an "Are you sure?" confirmation dialog on the `beforeRemove` navigation event — confirming discards the run, cancelling preserves progress. Fires `screen_checklist_run`, `run_item_toggled`, and `run_completed` analytics. Not yet reachable from the UI — there is no "Start run" entry point yet (WU3).
- CheL-4 WU1: Added the run domain model and pure helpers (`src/features/runs/domain/models.ts`: `startRun`, `toggleRunItem`, `isRunComplete`, `completeRun`, `checkedCount`) and an in-memory `useRuns` state hook (`src/features/runs/useRuns.tsx`), wired into `App.tsx`. No UI or user-facing change yet.

### [test]
- CheL-4 WU0: Drafted red integration scenario stubs for checklist runs (`src/features/runs/ui/RunScreen.test.tsx`). No user-facing change yet.

## [0.6.0] — 2026-09-18 (PR #21 merged)

### Changed
- [user] CheL-20: Removed the sections feature. A checklist's items are now always shown as one flat list — there is no more grouping into named sections, no section chip picker when adding an item, and no way to create, reorder, or delete a section. Reordering items by dragging them is unchanged.
- [app] Domain: removed `Section`, `Item.sectionId`, `Checklist.sections`, `normalizeChecklist`, `moveSection`, `resolveSectionDrop`, `Row`, and `buildRows` (`domain/models.ts`); `moveItem`/`createItem` simplified to plain flat-list signatures. State: `useChecklists` drops `addSection`/`deleteSection`/`moveSection`. UI: `ChecklistDetailScreen` renders `checklist.items` directly through `Sortable`; deleted `ui/components/SectionHeader.tsx`. Analytics: removed `section_added`, `section_reordered`, and `item_moved_to_section` events, and `item_reordered`'s `section_id` property. Data: `AsyncStorageChecklistRepository`'s migration now also strips any legacy `sectionId`/`sections` fields on read and no longer carries them forward on re-save.

## [0.5.0] — 2026-09-17 (PR #17 merged)

### Changed
- [user] CheL-14: The app's visual design is now consistent, modern, and lightweight — a light blue-ish color scheme replaces the previous white/gray/black look, the navigation header background matches the screen body with a flat back button (no more rounded bubble), item rows and section headers use an opaque background matching the rest of the screen (the item being dragged during reorder no longer lets the list behind it show through), and every text-only action button (Add, Edit, Delete, Rename, Save, Cancel, "New section") is now an icon button.
- [app] Added `src/shared/theme/colors.ts` (the app's single color-token source) and `src/shared/ui/IconButton.tsx` (shared icon-only action button, backed by the new `react-native-vector-icons` dependency). Applied across `HomeScreen`, `ChecklistDetailScreen`, `ItemRow`, `SectionHeader`, and `RootNavigator`. A custom drag "lift" shadow effect was attempted but reverted after it was found to freeze the drag-to-reorder gesture (calling `setState` from the `Sortable` component's `onDragStart` mid-gesture); the opaque-background fix is unaffected since it does not depend on drag state.

## [0.4.0] — 2026-09-17 (PR #16 merged)

### Changed
- [user] CheL-15: A checklist is now a reusable template only — you can no longer check items off (or "Clear checked") directly on the checklist itself; that's reserved for a checklist run once runs ship. The home screen now shows a plain item count (e.g. "7 items") instead of "X of Y left".
- [app] Domain: removed `Item.checked` and `countUnchecked` (`domain/models.ts`). State: removed `toggleItem`/`clearCheckedItems` from `useChecklists`. UI: `ItemRow` and `ChecklistDetailScreen` drop the toggle/clear-checked affordances; `HomeScreen` renders a plain item count. Data: `AsyncStorageChecklistRepository`'s migration now strips any legacy `checked` field on read. Analytics: removed `item_toggled` and `checked_items_cleared`.

## [0.3.0] — 2026-09-17 (PR #12 merged)

### Added
- [user] CheL-3: You can now organize a checklist into named sections, and reorder items and sections by dragging them, right from the checklist detail screen. A chip picker above the "New item" input lets you add a new item straight into any section. Sections can also be deleted (with confirmation), returning their items to the default section.
- [app] Domain: `Section`, `Item.sectionId`, `Checklist.sections`, `normalizeChecklist`, `buildRows`, `moveItem`/`moveSection`/`resolveItemDrop`/`resolveSectionDrop` ordering helpers, and storage-read migration/normalization (`domain/models.ts`). State: `useChecklists` gains `addSection`, `deleteSection`, `moveItem`, `moveSection`, and a sectioned `addItem`. UI: `ChecklistDetailScreen` renders `buildRows(checklist)` through `react-native-reanimated-dnd`'s `Sortable`/`SortableItem`/`SortableItem.Handle`, with extracted `ui/components/ItemRow.tsx` and new `ui/components/SectionHeader.tsx` handling drag handles. Fires all four approved analytics events (`item_reordered`, `item_moved_to_section`, `section_reordered`, `section_added`); `AnalyticsProperties` now allows `null` values.

## [0.2.0] — 2026-09-17 (PR #7 merged)

### Added
- [user] You can now add, check off/uncheck, edit, and delete items on a checklist. Checked items stay visible with a strikethrough style, and a "Clear checked" action removes them all in one tap once you're done with a list.
- [app] Extended `useChecklists` with item-CRUD methods (`addItem`/`toggleItem`/`editItem`/`deleteItem`/`clearCheckedItems`) and the `ChecklistDetailScreen` UI, plus item-related analytics events and an updated `AnalyticsService.logScreenView` signature that accepts properties.

## [0.1.0] — 2026-09-17 (PR #6 merged)

### Added
- [user] You can now create, rename, and delete checklists from the home screen, with a running count of how many items are left to check off once a checklist has items.
- [app] Added the checklists feature's domain/data/state/ui layers (`Checklist`/`Item` models, an AsyncStorage-backed repository, and a `useChecklists` hook) and wired up React Navigation between the home screen and a checklist detail screen.
