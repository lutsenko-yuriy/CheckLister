# Local iOS scenarios

CheL-26 adds Maestro flows against the installed app and real native navigation;
CheL-5 extends them with completed-run history coverage. Jest remains the
unit/component test suite. These scenarios are local only; Android validation
and CI integration are follow-up work.

## Tool choice

Maestro tests the installed simulator app through native UI interactions and YAML
flows without adding a test framework to the app binary. Detox offers app-aware
synchronization but requires additional native/test-runner setup. For these
local scenarios, Maestro keeps setup smaller. See the official
[Maestro iOS guide](https://docs.maestro.dev/get-started/supported-platform/ios)
and [Detox setup](https://wix.github.io/Detox/docs/introduction/project-setup/).

## Setup

Install Xcode (with an iOS Simulator runtime), the project's JS/CocoaPods
dependencies, Java 17+, and [Maestro CLI](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli):

```bash
brew install mobile-dev-inc/tap/maestro
java -version
maestro --version
xcrun simctl list devices available
```

Choose a simulator UDID and boot it if shut down:

```bash
xcrun simctl boot <UDID>
xcrun simctl bootstatus <UDID> -b
```

Build the current checkout in Release mode so the test has a bundled JS file and
needs no Metro server. Run from the repository root:

```bash
xcodebuild -workspace ios/CheckLister.xcworkspace -scheme CheckLister \
  -configuration Release -sdk iphonesimulator -destination 'id=<UDID>' \
  -derivedDataPath /tmp/checklister-scenarios-build CODE_SIGNING_ALLOWED=NO build
xcrun simctl install <UDID> \
  /tmp/checklister-scenarios-build/Build/Products/Release-iphonesimulator/CheckLister.app
npm run scenarios:ios -- <UDID>
```

Replace `<UDID>` everywhere with the same simulator identifier. Rebuild and
reinstall after app changes; the runner checks that the app exists, not that it
matches your checkout. A Debug app also works if Metro is already serving this
checkout, but Release is the reproducible default. Simulator/driver operations
need permission outside an agent's filesystem sandbox; they do not use macOS
System Events UI scripting.

## Coverage

CheL-36 adds two installed-app contracts for cold and foreground external-run
links. CheL-40 adds three more for the `checklister://select` picker: an
invalid cold callback, a failed callback delivery, and a select request
arriving during an active run. Valid-checklist external-run/-select
completion and cancellation remain component integration scenarios until
CheL-34 provides safe, deterministic checklist IDs for installed-app tests
without clearing simulator data.

| Flow                   | Assertions                                                                                                                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run-complete.yaml`    | Empty checklist cannot start; completion disabled until all items checked; toggle/uncheck; completion returns to unchanged template; fresh run starts unchecked.                                                                    |
| `run-exit.yaml`        | Back shows confirmation; Cancel preserves progress; Discard returns to template; new run resets progress.                                                                                                                           |
| `run-gesture-ios.yaml` | Edge swipe navigates on an unprotected checklist screen (positive control); same swipe prompts before leaving an active run; Cancel preserves progress and interactivity; Back/Cancel/Discard and subsequent navigation still work. |
| `run-history.yaml` | A completed run exposes filtered and global history, keeps its snapshotted item count after the checklist changes, and remains globally visible after checklist deletion. |
| `run-history-discard.yaml` | Cancelling an exit preserves progress, while discarding one or more runs never exposes checklist history. |
| `external-run-invalid-callback-ios.yaml` | A cold `checklister://run` launch rejects an invalid callback, explains the problem, and leaves the home screen usable. |
| `external-run-callback-failure-ios.yaml` | A link delivered immediately after launch returns an error for a missing checklist, reports failed callback delivery, and preserves existing simulator data. |
| `external-select-invalid-callback-ios.yaml` | A cold `checklister://select` launch rejects an invalid callback, explains the problem, and leaves the home screen usable without opening the picker. |
| `external-select-callback-failure-ios.yaml` | A foreground select link opens the picker; picking a checklist with an undeliverable callback reports failed callback delivery and returns to a usable home screen. |
| `external-select-during-run-ios.yaml` | A foreground select link during an active run pushes the picker above it; cancelling the picker returns to the run with its progress intact. |
| `checklist-item-editing-ios.yaml` | Editing an item and saving replaces its text while the other item is unchanged; editing and cancelling preserves the original text; clearing an item's text and saving leaves it unchanged (current spec: empty edits are ignored); a run started afterward shows the saved item text. |

On the tested iOS 26.5 / react-native-screens 4.28.0 combination, swiping an active
run opens confirmation without removing the run. This matches the product spec.
Older source comments describe the gesture as disabled; the real-target test
intentionally asserts the observed dialog, Cancel, and continued interactivity.
Revalidate this behavior when upgrading native navigation dependencies.

Each flow cold-launches without clearing storage, creates a uniquely named
`Scenario <timestamp>-<random>` checklist via the UI, and deletes only that checklist
on success. Do not run the suite while using an unfinished in-memory run: launching
the app restarts its process. If a flow fails or is interrupted, its fixture can
remain for diagnosis; delete that specific `Scenario ...` checklist manually after
inspection. Existing checklists are never bulk-cleared. Run flows serially on a
single device; concurrent suites on that device would interfere.

`run-history.yaml` necessarily leaves one uniquely named completed-history
entry after deleting its checklist because history deletion is intentionally
not part of the product. Run the suite on a dedicated test simulator. CheL-34
tracks a safe isolation/cleanup mechanism that preserves unrelated data while
preventing this generated history from accumulating.

## Results and diagnosis

The runner requires an explicit booted iOS UDID and installed CheckLister. It
returns Maestro's exit status unchanged (nonzero means failure), prints a unique
artifact directory under `artifacts/scenarios-ios/`, and requests a JUnit report and
Maestro test artifacts there. `SCENARIOS_ARTIFACTS_DIR` overrides the parent directory.
Generated artifacts are gitignored. Inspect failure screenshots, command logs,
and the current hierarchy:

```bash
maestro --device <UDID> hierarchy
maestro --device <UDID> test .maestro/run-exit.yaml
```

Use labels/placeholders and progress text for selectors. The home screen exposes
`delete-checklist-<title>` on each Delete button because iOS flattens the list
accessibility hierarchy; parent/descendant matching can otherwise select a
different checklist. The same flattening applies to a checklist's item rows, so
`ItemRow` exposes `edit-item-<text>` and `delete-item-<text>` testIDs for its
per-row Edit/Delete buttons. Fixtures have unique titles and item text. The
confirmation Delete is scoped to the button group containing Cancel, because
background buttons remain in the native alert hierarchy. Avoid
fixed sleeps, optional assertions and retries that hide defects. Helpers live
under `.maestro/helpers/`; only top-level flows are discovered by the suite.

Item rows sit inside `react-native-reanimated-dnd`'s `Sortable`, which renders
a `FlatList`/`ScrollView` that swallows a touch outside a focused `TextInput`
to dismiss the keyboard by default (`keyboardShouldPersistTaps="never"`) — the
draft input's Save/Cancel buttons used to need a second tap because of this
(CheL-54). The library doesn't expose that prop, so
`patches/react-native-reanimated-dnd+2.0.0.patch` (applied via `patch-package`
on `postinstall`) threads `keyboardShouldPersistTaps` through to `Sortable`,
and `ChecklistDetailScreen` sets it to `"handled"`.

Runner contract tests use stub executables, not a simulator:

```bash
python3 -m unittest discover -s scripts/tests -p 'test_scenarios_ios.py'
```

The contract checks these states before invoking Maestro:

| Arguments / target / app                | Outcome                                                        |
| --------------------------------------- | -------------------------------------------------------------- |
| Missing or extra argument               | Usage error, exit 2                                            |
| Unknown, non-iOS or shut-down simulator | Actionable error; no Maestro invocation                        |
| Installed app missing                   | Installation instructions; no Maestro invocation               |
| Valid target and app                    | Run suite; retain Maestro success/failure status and artifacts |

## Verified baseline — 2026-09-18

- Maestro 2.10.0; Java 17.0.5; iPhone 17 Pro simulator on iOS 26.5.
- React Native 0.87.1 / react-native-screens 4.28.0; Release simulator build.
- Two consecutive unchanged-suite runs: **3/3 passed**, approximately **2m 4s**
  each. Both produced JUnit reports with zero failures.
- An intentionally impossible assertion in a temporary flow exited **1** and
  produced a failure screenshot, hierarchy, and driver/device logs.
- **87 Jest tests**, **6 runner contract tests**, and **ESLint** passed.

Timing excludes building/installing the app and first-time tool setup. The
three flows run serially; initial driver startup adds overhead to wall time.

## Verified CheL-5 expansion — 2026-09-18

- All **5/5** flows passed against a freshly built and installed Release app
  on the same iPhone 17 Pro / iOS 26.5 simulator, in **3m 27s**.
- Both new history flows passed: filtered/global completed history with
  snapshot item counts and deletion retention, plus discarded-run exclusion.
- **103 Jest tests**, **6 runner contract tests**, TypeScript, and ESLint passed.

## Verified CheL-36 expansion — 2026-09-20

- All **7/7** iOS flows passed against a Release build on the iPhone 17 Pro /
  iOS 26.5 simulator in **3m 54s**, including cold-link rejection and
  foreground callback-failure recovery.
- An Android 36 emulator accepted the documented external-run intent into the
  Release app's `MainActivity` and displayed the expected callback-delivery
  failure dialog.
- **162 Jest tests**, **6 runner contract tests**, TypeScript, ESLint, and iOS
  and Android Release builds passed.

## Verified CheL-28 expansion — 2026-09-21

- Two consecutive full-suite runs against a Release build on the iPhone 17 Pro
  / iOS 26.5 simulator: **11/11** flows passed each time, in 6m 34s and 6m 38s.
- The new item-editing flow covers edit+save, edit+cancel, an ignored
  empty-text save, and a run reflecting the saved text — surfacing the
  Save/Cancel double-tap behavior noted above.
- **250 Jest tests** and ESLint passed.

## Verified CheL-54 fix — 2026-09-21

- Two consecutive full-suite runs against a Release build on the iPhone 17 Pro
  / iOS 26.5 simulator, with the `keyboardShouldPersistTaps` patch applied:
  **11/11** flows passed each time, in 6m 36s and 6m 32s.
- `checklist-item-editing-ios.yaml` now taps Save/Cancel once, confirming the
  first-tap fix on a real simulator.
- **251 Jest tests**, TypeScript, and ESLint passed.
