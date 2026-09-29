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

### Changed

- [test] #104: Investigated Android equivalents for `checklist-persistence-restart-ios.yaml` and `run-gesture-ios.yaml`. Raised the persistence-restart flow's own drag swipe from `4000ms` to `8000ms` after reproducing the identical `activateAfterLongPress(200)` race CheL-105 WU2 fixed for `checklist-drag-reorder-ios.yaml` (10/10 clean on iOS). Android did not clear the race at the same bar (2/10 and 1/10 drag-order failures at 8000ms/12000ms respectively) and a much-more-frequent-than-documented cold-launch/relaunch race also surfaced (7/20 standalone runs) — both filed as their own investigation, #110; `checklist-persistence-restart-android.yaml` is not added by this ticket. Separately, confirmed an Android edge swipe produces the identical `usePreventRemove` dialog `run-exit-system-back-android.yaml`'s system-back-key path already covers, concluding `run-gesture-ios.yaml` needs no Android equivalent. No product/`src/` change.
- [test] #110: Fixed the Android cold-launch/relaunch assertion-timing race in `helpers/create-checklist.yaml` and `helpers/relaunch-and-open-checklist.yaml`, confirmed as a structural timing-margin issue (cold-start latency on the emulator averages ~5.5-10s with a tail to 13-16s, against Maestro's 7s `assertVisible` default) rather than rare flakiness. Both helpers now use `extendedWaitUntil` with a 20000ms timeout in place of a bare `assertVisible`. Verified 15/15 clean (60/60 cold-launch opportunities) on a standalone probe, versus the ~35% baseline. The drag-activation race half of #110 remains open — no available injection primitive (Maestro `swipe` or `adb input draganddrop`) can express the proposed long-press-then-move workaround; see `docs/knowledge/notes/110.md`. No product/`src/` change.
- [test] #110: Fixed the Android drag-activation-race half of #110, closing it out. `checklist-persistence-restart-android.yaml` (previously withheld by CheL-104 pending this investigation) now wraps its drag swipe (`duration: 8000`) and order assertions in Maestro's native `retry` command (`maxRetries: 3`), absorbing 8000ms's residual ~10-20% per-attempt failure rate. Verified 10/10 full-flow runs on `Pixel_5_API36` (drag succeeded on the first attempt every time), plus a separate stress test confirming the retry mechanism itself recovers correctly and doesn't corrupt state on a failed attempt. No product/`src/` change.
- [wip] #105 (WU1): Local iOS/Android scenario runners now accept a comma-separated device list and split the suite across them via Maestro's own `--udid`/`--shard-split`, restoring each device's own snapshot first — a real sharded iOS run measured a 41% wall-time reduction. Single-device invocation is unchanged. No product/`src/` change.
- [test] #105 (WU2): Re-probed `checklist-drag-reorder-ios.yaml`'s swipe duration now that CheL-98's coordinate fix is in place; lowered both swipes from `12000ms` to `8000ms` (10/10 clean at 8000ms, 9/10 failing at 4000ms — a 4000ms margin over the failure edge). No product/`src/` change.
- [test] #97: Local Android Maestro scenarios now capture and restore an app-data snapshot (`npm run scenarios:snapshot:android`) before every suite run, the same restore-before-run mechanism #34 added for iOS — via `adb root` + `tar` rather than `rsync`, since Android app-private storage isn't host-readable and this suite's Release build is never `run-as`-debuggable, and keyed by AVD name (not the port-based emulator serial) to avoid cross-AVD snapshot mix-ups. `run-history.yaml`/`run-history-discard.yaml` are now also tagged `android` (previously `ios`-only, promoted alongside the mechanism that isolates their persistent state) — see `docs/SCENARIOS.md`'s "Isolating persistent test data" section. No product/`src/` change.

### Fixed

- [test] #98: `checklist-drag-reorder-ios.yaml`'s two drag swipes were unreliable — one swipe's fixed start coordinate (`48%`) missed the target drag-handle entirely on-device, and even once corrected both swipes could still lose a timing race against `react-native-reanimated-dnd`'s `activateAfterLongPress(200)` gesture activation. Corrected the coordinate and slowed both swipes to `duration: 12000`, verified 10/10 across an iPhone 17 and an iPhone 17 Pro simulator plus a full-suite pass. No `src/` change; the reported "Complete the checklist" tap-swallow symptom on `run-complete.yaml`/`run-history.yaml` remains open in #98, unreproduced.
- [wip] #92 (WU1): TestFlight's "What to Test" was silently dropped because `pilot` returned before Apple finished processing the build — `skip_waiting_for_build_processing` is removed so the changelog actually sets, and the `testflight` job now has a `timeout-minutes: 45` safety net in case a stuck previous build's "Processing" state makes the wait hang (fastlane/fastlane#6069).
- [meta] #92 (WU3): The app version now only bumps for a `[user]`/`[app]` CHANGELOG entry — every other tag files under `## [Unreleased]` instead, generalizing the multi-WU `[wip]` convention to all non-user-facing changes. Also corrects CHL-2's `0.13.1` version bump (an earlier `[ci]`-only entry with nothing user-facing) back to `0.13.0`, and updates `release_gate.py` so a deliberate version-decrease correction like this one no longer fails CI.

### Added

- [wip] #92 (WU2): New `draft-release-notes` skill drafts plain-language `[user]` "What's New"/"What to Test" CHANGELOG bullets for a PR, self-checked against a jargon/tone/promotional-language checklist; wired inline into `ship`.

### Changed

- [ci] CHL-2: Fastlane's `beta` lane now auto-assigns the "Testers" TestFlight group on upload, instead of requiring it to be assigned manually in App Store Connect after every build.
- [meta] #87: `shared/i18n/` is now the `@checklister/i18n` npm-workspace package (`packages/i18n/`), with an ESLint-enforced import boundary preventing it from ever depending back on app code (`src/`/`App.tsx`); the one dependency it previously had on the host's analytics module now crosses via a caller-supplied callback prop instead. No behavior change.
- [test] #34: Local iOS Maestro scenarios now capture and restore a "golden" app-data snapshot (`npm run scenarios:snapshot:ios`) before every suite run, so completed-run history (and any future persistent scenario-owned record) can never accumulate across repeated runs — no product/`src/` change, and a failed run's on-device state is left untouched for diagnosis rather than cleared. Android isolation and CI integration are tracked separately (#97, #100).

## [0.13.0] — 2026-09-24 (PR #86 merged)

### Added

- [wip] #80 (WU1): Localization infrastructure — `react-native-localize`, a typed in-house `src/shared/i18n/` module (OS preferred-locale resolution, hand-written CLDR plural rules for en/de/fr/ru, `{{param}}` interpolation, locale-aware date formatting), `I18nProvider`/`useI18n()` mounted at the app root, and the `app_language_resolved` analytics event. English only; no visible change yet.
- [wip] #80 (WU2): Extracted every UI-facing string (screen titles, button/field labels, alerts, empty states, the checklist item-count and run-history plurals, and history dates) into `src/shared/i18n/locales/en.ts`, wired through `t()`/`formatDateTime()` in place of hardcoded literals. English only; no visible change yet.
- [wip] #80 (WU3): Added German, French and Russian translations (`src/shared/i18n/locales/{de,fr,ru}.ts`), extended `SUPPORTED_LANGUAGES` to all four languages, a locale-integrity test guarding key parity/placeholders/plural coverage against `en.ts`, and translated integration scenarios for the localized screens. The UI now actually renders in the OS-preferred language; the native per-app language switch, localized display name and layout hardening land in WU4.
- [user] #80 (WU4): CheckLister now speaks German, French and Russian. Change the language for CheckLister only from iOS Settings → CheckLister → Language, or Android 13+'s per-app language setting — there is no in-app language switch. The Home Screen / launcher name follows suit ("CheckLister" in English, German and French; "ЧекЛистер" in Russian). `CFBundleLocalizations`/`res/xml/locales_config.xml` declare the four supported languages to the OS, a Jest drift test keeps them in sync with `SUPPORTED_LANGUAGES`, and Android's `MainActivity` now handles a language change itself (`locale|layoutDirection` in `configChanges`) instead of restarting, so an in-progress run or a pending externally-requested checklist selection survives it.

## [0.12.0] — 2026-09-24 (PR #79 merged)

### Added

- [app] GH-67: Full App Store/Play Store-ready icon set for iOS (all `AppIcon` slots incl. 1024×1024 marketing icon) and Android (adaptive icon with themed/monochrome layer, plus legacy square/round fallbacks), generated from a single `assets/icon/icon.svg` master via `scripts/generate_icons.py`.
- [meta] CheL-61: Recorded the manual iOS release-pipeline verification run's results (success, blocked only by the now-fixed missing app icons) and a `release_gate.py` comment-parsing bug found and fixed during it.
- [user] CheL-70: Night mode — CheckLister now follows the OS-level light/dark appearance setting across every screen (checklists, runs, run history, external-run picker) and the navigation chrome, with no in-app toggle. Adds a custom launch/splash screen showing the app icon's glyph on a theme-matched background, replacing the platform default.
- [ci] CheL-72: The `ios-build` PR-validation job now compiles with `-configuration Debug` instead of `Release`, caches the CocoaPods spec repo alongside `ios/Pods`, and is skipped entirely when a PR touches no native/app-relevant paths (`ios/`, `android/`, `package.json`, `package-lock.json`, `App.tsx`, `index.js`, `patches/**`).
- [user] CheL-77: Dark-appearance iOS Home Screen icon variant, fixing the white flash the OS's own launch icon-zoom transition showed in dark mode.
- [ci] Fastlane's `beta` lane now builds TestFlight's "What to Test" notes automatically from this section's `[user]`/`[app]`-tagged bullets, instead of leaving testers with no build notes.

## [0.11.0] — 2026-09-23 (PR #64 merged)

### Added

- [app] First version.
- [wip] CheL-61 (WU1): GitHub Actions PR-validation workflow — lint, typecheck, unit tests, script contract tests, workflow-YAML lint, and an unsigned iOS simulator build run on every pull request.
- [wip] CheL-61 (WU2): Real App Store Connect bundle identifier (`com.checklister.checklisterApp`) replacing the React Native template id, plus manual Release signing configuration (team, certificate, provisioning profile) so the app is addressable for signed builds.
- [ci] CheL-61 (WU3): Release gate (`scripts/ci/release_gate.py`) plus a Fastlane-driven GitHub Actions workflow that archives a signed Release build and uploads it to TestFlight on every version-bumped, `[user]`/`[app]`-tagged merge to `main`. App Store submission and promotion remain fully manual.

## [0.10.5] — 2026-09-22 (PR #60 merged)

### Added

- [meta] CheL-31: Local Android emulator smoke test coverage, alongside a platform-tagging refactor of the existing iOS suite. Maestro flows now use `appId: ${APP_ID}` (interpolated per platform) instead of a hardcoded iOS bundle id, and every top-level flow declares a `tags:` list (`ios`/`android`) so each platform runner selects its own subset with `--include-tags`. New `scripts/scenarios-android.sh` (`npm run scenarios:android`) validates the target emulator and installed app before running the Android-tagged suite, with an `ANDROID_HOME`/`ANDROID_SDK_ROOT` `adb` fallback. New `run-exit-system-back-android.yaml` verifies the Android hardware/gesture system-back key during an active run behaves like the app Back button; empirically confirmed on a real `Pixel_5_API36` emulator that the predictive-back risk flagged in planning (targetSdk 36) does not bypass the existing confirmation dialog. `docs/SCENARIOS.md` documents both platforms' setup and a verified real-hardware baseline (3/3 Android runs x2, 13/13 iOS regression).

## [0.10.4] — 2026-09-22 (PR #58 merged)

### Added

- [meta] CheL-30: Local iOS smoke test coverage for checklist persistence across real app-process restarts — edits, reordering, item deletion, and an in-memory partial run correctly not being recovered all verified across three restarts. `ChecklistSummaryRow` now takes an optional `testID`, and `HomeScreen` sets it to `checklist-row-<title>`, needed because reopening a checklist by text selector is unreliable specifically right after a cold relaunch (documented in `docs/SCENARIOS.md`).

## [0.10.3] — 2026-09-22 (PR #57 merged)

### Added

- [meta] CheL-29: Local iOS smoke test coverage for real drag-to-reorder — dragging an item down two rows then back up via its real drag handle, and a run confirming the final template order carries over. `ItemRow`'s drag handle now exposes a row-scoped `drag-handle-<text>` testID, matching the existing per-row selector pattern. Documents two Maestro/`react-native-reanimated-dnd` constraints in `docs/SCENARIOS.md`: the `swipe` command only accepts point/percentage coordinates (no element selectors), and the library's pan gesture needs a slow (4s) synthetic swipe to activate at all.

## [0.10.2] — 2026-09-21 (PR #56 merged)

### Fixed

- [user] CheL-54: A checklist item's Save/Cancel buttons now respond on the first tap while its draft text field is still focused, instead of requiring a second tap. `react-native-reanimated-dnd`'s `Sortable` didn't expose `keyboardShouldPersistTaps`, so this patches the library (via `patch-package`) to accept and forward it, and sets it to `"handled"` on the checklist item list.

## [0.10.1] — 2026-09-21 (PR #55 merged)

### Added

- [meta] CheL-28: Local iOS smoke test coverage for checklist item editing — edit+save, edit+cancel, an ignored empty-text save, and a run reflecting the saved item text. `ItemRow`'s Edit/Delete buttons now expose row-scoped `edit-item-<text>`/`delete-item-<text>` testIDs, matching the home screen's existing per-row selector pattern. Discovered and tracked separately as CheL-54: item Save/Cancel need a second tap while the draft input is still focused.

## [0.10.0] — 2026-09-21 (PR #53 merged)

### Added

- [user] CheL-40: Another mobile app can now ask the user to pick one of their checklists through a `checklister://select` link and receive the chosen checklist's ID and name (or a cancellation) via callback URL. The picker never disturbs an active run — it opens above it, and cancelling returns to the run untouched.
- [app] Added a validated external-select contract sharing URL primitives with CheL-36's external-run contract via a new `shared/links` layer, an in-memory (never persisted) selection session, a read-only `ChecklistSelectScreen` picker with a shared `ChecklistSummaryRow`, and a generalized `ExternalLinkCoordinator` dispatching incoming URLs by verb (`run` or `select`). A `run` link preempts an open picker; a second `select` link re-points the picker instead of opening a duplicate. Android registers the `select` host alongside `run`.
- [test] Added Jest coverage for the select contract, session, delivery, screen, and coordinator dispatch (including run/select preemption races), plus three installed-app Maestro scenarios for select's invalid-callback, failed-delivery, and during-a-run flows.

## [0.9.2] — 2026-09-20 (PR #48)

### Fixed

- [user] CheL-46: Every icon-only action button (Add, Rename, Delete, Save, Cancel, Edit, Run history, Back) now has at least a 44×44pt touch target, up from an effective ~38×38pt, matching Apple HIG / Material minimum tap-target guidance.

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
