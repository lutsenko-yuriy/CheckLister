# Changelog

A record of all versioned releases. For planned work and known issues, see @docs/BACKLOG.md.

---

<!-- This file is maintained by the Product Owner agent.
     New sections are prepended after each merged PR in the format:

## [X.Y.Z] — YYYY-MM-DD (PR #N merged)

### Added / Changed / Fixed
- ...
-->

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
