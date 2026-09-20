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

_(nothing yet)_

## [0.9.1] — 2026-09-20 (PR #47)

### Fixed
- [user] CheL-45: The Run screen's "Back" button text now meets WCAG AA contrast (4.02:1 → 4.82:1) against the app background, via a new `colors.linkText` token reserved for text usage.

## [0.9.0] — 2026-09-20 (PR #42)

### Added
- [user] CheL-36: Another mobile app can now start a fresh run for a specific checklist through `checklister://run` and receive a completed, cancelled, or error result through its callback URL. External requests replace any active run, completed results include the saved run ID, and CheckLister explains invalid callbacks or failed returns.
- [app] Added validated external-run and callback contracts, replacement-safe run state, cold-start and foreground coordination, privacy-safe analytics, native iOS and Android URL handoff modules, and a public integration guide in `docs/EXTERNAL_RUNS.md`.
- [test] Added Jest coverage and installed-app Maestro scenarios for valid, invalid, failed, replaced, completed, and cancelled external-run flows, including lifecycle race handling on both platforms.

## [0.8.0] — 2026-09-18 (PR #35)

### Added
- [user] CheL-5: Completed checklist runs now appear in newest-first history. The home screen opens history across all checklists, while a checklist opens its own filtered history; each entry preserves the checklist title, completion date, and item count captured for that exact run, even after the checklist changes or is deleted. History actions appear only when matching completed runs exist.
- [app] Added immutable `RunHistoryEntry` snapshots, an AsyncStorage-backed `RunRepository`, global and filtered history screens, persistence failure recovery, load/write race protection, analytics, and Jest plus Maestro coverage. Also established `CODE_STYLE.md` and strengthened planning guidance with soft PR/WU size checkpoints during the ticket debrief.

## [0.7.1] — 2026-09-18 (PR #27)

### Added
- [meta] CheL-26: Local iOS scenario automation with Maestro for checklist-run completion, Back/Cancel/Discard, and native swipe confirmation. `npm run scenarios:ios -- <UDID>` validates the selected simulator and installed app, preserves failure status, and saves diagnostic artifacts. Includes isolated fixtures, a precise cleanup selector, runner checks, and setup instructions in `docs/SCENARIOS.md`.
- [meta] Recorded the CheL-26 debrief. Broader scenario-policy changes remain separate in CheL-32 / draft PR #33; additional scenario coverage is tracked in CheL-28–CheL-31.

## [0.7.0] — 2026-09-18 (PR #25 merged)

### Added
- [user] CheL-4: You can now start a run of a checklist — a fresh, independent snapshot of its items, all unchecked. Check items off from the run screen (this never affects the checklist template itself), then finish with "Complete the checklist", enabled once every item is checked. Leaving the run screen before completion (back button or swipe gesture) prompts an "Are you sure?" confirmation; confirming discards the run and returns to the checklist, cancelling keeps your progress. A "Start run" button on the checklist screen is the entry point (disabled for an empty checklist).
- [app] Domain: `src/features/runs/domain/models.ts` (`ChecklistRun`, `RunItem`, `startRun`, `toggleRunItem`, `isRunComplete`, `completeRun`, `checkedCount`). State: `useRuns` (`src/features/runs/useRuns.tsx`) — in-memory only, single active run, no repository or persistence yet (a discarded or unfinished run cannot be recovered; that's by design — see `docs/PRODUCT_SPEC.md` Feature 4). UI: `RunScreen.tsx` + `RunItemRow` component, wired into `RootNavigator` as the `Run` route; `ChecklistDetailScreen` gained the "Start run" button. The exit-confirmation lock uses React Navigation's `usePreventRemove` hook — a manual `beforeRemove` listener can't safely block the iOS swipe-back gesture (it pops the native screen as part of the gesture animation itself, independent of JS), so `usePreventRemove` was used instead, since it disables the native gesture at the native level while a run is active and incomplete. Fires `run_started`, `screen_checklist_run`, `run_item_toggled`, and `run_completed` analytics.

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
