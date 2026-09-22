# Local iOS and Android scenarios

CheL-26 adds Maestro flows against the installed app and real native navigation;
CheL-5 extends them with completed-run history coverage. CheL-31 adds an
Android emulator runner and system-back coverage alongside the existing iOS
suite. Jest remains the unit/component test suite. These scenarios are local
only; CI integration remains follow-up work.

Every top-level flow declares `appId: ${APP_ID}` (interpolated by Maestro from
the `-e APP_ID=...` runner flag, per platform bundle id) and a `tags:` list
(`ios`, `android`, or both) so `--include-tags <platform>` selects the right
subset. `scripts/scenarios-ios.sh` passes `-e APP_ID=org.reactjs.native.example.CheckLister
--include-tags ios`; `scripts/scenarios-android.sh` passes
`-e APP_ID=com.checklister --include-tags android`. Helper flows under
`.maestro/helpers/` also use `appId: ${APP_ID}` but stay untagged — Maestro
only discovers top-level flows, so tags there would be inert.

## Tool choice

Maestro tests the installed simulator/emulator app through native UI
interactions and YAML flows without adding a test framework to the app
binary. Detox offers app-aware synchronization but requires additional
native/test-runner setup. For these local scenarios, Maestro keeps setup
smaller. See the official
[Maestro iOS guide](https://docs.maestro.dev/get-started/supported-platform/ios),
[Maestro Android guide](https://docs.maestro.dev/get-started/supported-platform/android),
and [Detox setup](https://wix.github.io/Detox/docs/introduction/project-setup/).

## iOS setup

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

## Android setup

Install Android Studio (or the standalone SDK) with an emulator system image,
the project's JS dependencies, Java 17+, and Maestro CLI. `adb` must resolve
either on `PATH` or under `$ANDROID_HOME`/`$ANDROID_SDK_ROOT`'s
`platform-tools/` — `scripts/scenarios-android.sh` falls back to that path
when `adb` is not on `PATH` directly (this shell does not export
`ANDROID_HOME` by default):

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
brew install mobile-dev-inc/tap/maestro
java -version
maestro --version
emulator -list-avds
```

Boot an emulator, preserving existing data (no `-wipe-data`):

```bash
emulator -avd <avd-name> &
adb wait-for-device
adb devices
```

Build the current checkout in Release mode from the repository root — the
release build signs with the debug keystore
(`android/app/build.gradle`), so it installs without extra signing setup —
and install with `-r` to preserve existing app data:

```bash
cd android && ./gradlew assembleRelease && cd ..
adb -s <serial> install -r android/app/build/outputs/apk/release/app-release.apk
npm run scenarios:android -- <serial>
```

Replace `<serial>` everywhere with the `adb devices` serial (e.g.
`emulator-5554`). A serial must both appear in `adb devices` as `device`
(not `offline`/`unauthorized`) and match `emulator-*` — the runner rejects a
physical-device serial the same way. On first run per emulator, Maestro
installs its own driver/server APKs; that is inherent to the tool and does
not affect app data.

## Coverage

CheL-36 adds two installed-app contracts for cold and foreground external-run
links. CheL-40 adds three more for the `checklister://select` picker: an
invalid cold callback, a failed callback delivery, and a select request
arriving during an active run. Valid-checklist external-run/-select
completion and cancellation remain component integration scenarios until
CheL-34 provides safe, deterministic checklist IDs for installed-app tests
without clearing simulator data.

`run-complete.yaml` and `run-exit.yaml` run on both platforms
(`tags: [ios, android]`); `run-exit-system-back-android.yaml` is
Android-only, covering what the app-level Back button flow cannot: the
hardware/gesture system-back key. Every other flow below is iOS-only,
matching the ticket's own scope (edge-swipe gestures, item editing,
drag-reorder, restart persistence, run history, and external-link handling
stay iOS-only until a dedicated ticket promotes them).
| Flow | Assertions |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run-complete.yaml` | Empty checklist cannot start; completion disabled until all items checked; toggle/uncheck; completion returns to unchanged template; fresh run starts unchecked. |
| `run-exit.yaml` | Back shows confirmation; Cancel preserves progress; Discard returns to template; new run resets progress. |
| `run-exit-system-back-android.yaml` | Android system back (hardware/gesture) during an active run shows the same confirmation as the app Back button; Cancel preserves progress and keeps the screen interactive; a second system back Discards and resets on the next run. |
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

Both runners require an explicit, validated target and installed app. Each
returns Maestro's exit status unchanged (nonzero means failure), prints a
unique artifact directory under `artifacts/scenarios-ios/` or
`artifacts/scenarios-android/`, and requests a JUnit report and Maestro test
artifacts there. `SCENARIOS_ARTIFACTS_DIR` overrides the parent directory for
either runner. Generated artifacts are gitignored. Inspect failure
screenshots, command logs, and the current hierarchy:

```bash
maestro --device <UDID-or-serial> hierarchy
maestro --device <UDID> test -e APP_ID=org.reactjs.native.example.CheckLister .maestro/run-exit.yaml
maestro --device <serial> test -e APP_ID=com.checklister --include-tags android .maestro/run-exit-system-back-android.yaml
```

Every flow (including helpers) now reads `appId: ${APP_ID}`, so a direct `maestro test`
invocation needs `-e APP_ID=<bundle id>` or it aborts before reaching the device —
`npm run scenarios:ios` and `npm run scenarios:android` already set this.

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

Real drag-to-reorder (CheL-29) needs `ChecklistDetailScreen` to expose a
row-scoped `drag-handle-<text>` testID on each item's handle, for the same
flattened-hierarchy reason as Edit/Delete. `react-native-reanimated-dnd`'s
pan gesture uses `activateAfterLongPress(200)`, so it never activates from a
fast synthetic swipe — a `duration: 1500` swipe produced zero movement in
testing. Maestro's `swipe` command also doesn't accept a `start`/`end`
element selector (`id`/`text`) at all — the flow schema only parses plain
point/percentage coordinates — so `checklist-drag-reorder-ios.yaml` swipes
between the handles' known screen percentages (fixed item row height, fixed
vertical offset above the list) with `duration: 4000`, which reliably
triggers and completes the drag.

Persistence-across-restart flows (CheL-30) use `stopApp` + `launchApp:
clearState: false` to simulate a real app-process kill without wiping
AsyncStorage — see `.maestro/helpers/relaunch-and-open-checklist.yaml`.
Reopening the checklist by **text** selector after a cold relaunch is
unreliable: iOS merges `ChecklistSummaryRow`'s title and item-count `Text`
children into one accessible node whose merged label apparently isn't
exposed through the same field Maestro's text selectors match against right
after a fresh launch (it resolves fine immediately after in-JS creation, but
never resolved post-restart even waiting 15-20s with `extendedWaitUntil` or
`scrollUntilVisible`'s `waitToSettleTimeoutMs` — confirmed via
`maestro hierarchy`: the row's `text`/`value` attributes were empty, with the
real content only in a separate `accessibilityText` field). `id`-based
selectors were unaffected, so `ChecklistSummaryRow` now takes an optional
`testID` and `HomeScreen` sets it to `checklist-row-<title>`, matching the
existing per-row selector pattern.

Runner contract tests use stub executables, not a device:

```bash
python3 -m unittest discover -s scripts/tests -p 'test_scenarios_ios.py'
python3 -m unittest discover -s scripts/tests -p 'test_scenarios_android.py'
python3 -m unittest discover -s scripts/tests -p 'test_maestro_flow_conventions.py'
```

Each runner's contract checks these states before invoking Maestro:

| Arguments / target / app                                                  | Outcome                                                        |
| ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Missing or extra argument                                                 | Usage error, exit 2                                            |
| Unknown, non-iOS/non-emulator, shut-down, offline, or unauthorized target | Actionable error; no Maestro invocation                        |
| Installed app missing                                                     | Installation instructions; no Maestro invocation               |
| Valid target and app                                                      | Run suite; retain Maestro success/failure status and artifacts |

The Android runner additionally falls back to `$ANDROID_HOME` or
`$ANDROID_SDK_ROOT`'s `platform-tools/adb` when `adb` is not directly on
`PATH`, and rejects a serial that doesn't match `emulator-*` even if `adb
devices` lists it as `device` (physical-device support is out of scope).

`test_maestro_flow_conventions.py` is a stdlib-only guard (no PyYAML) that
fails if any flow — including helpers — lacks `appId: ${APP_ID}`, or if any
top-level flow lacks a non-empty `tags:` list drawn from `ios`/`android`.
This catches a forgotten tag silently dropping a flow from both suites.

### Android divergences checked on the emulator

On `Pixel_5_API36` (Android 16 / API 36, predictive back enabled by
targetSdk 36 with no `android:enableOnBackInvokedCallback` override), the
system back key correctly triggered the same `usePreventRemove` confirmation
as the app Back button — no product defect found, so no follow-up ticket was
needed. Alert button labels (`Delete`, `Cancel`, `Discard`) rendered with
their normal case, not uppercased, so the existing helpers' selectors needed
no changes. `scrollUntilVisible` + `tapOn` by testID and `pressKey: Enter`
after `inputText` on the soft keyboard both behaved the same as on iOS.

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

## Verified CheL-29 expansion — 2026-09-22

- Two consecutive full-suite runs against a Release build on the iPhone 17 Pro
  / iOS 26.5 simulator: **12/12** flows passed each time, in 7m 26s both
  times.
- The new drag-reorder flow drags an item down two rows then back up via its
  real drag handle, asserts visible order after each move, and confirms a
  run started afterward preserves the final template order.
- **252 Jest tests**, TypeScript, and ESLint passed.

## Verified CheL-30 expansion — 2026-09-22

- Two consecutive full-suite runs against a Release build on the iPhone 17 Pro
  / iOS 26.5 simulator: **13/13** flows passed each time, in 8m 5s and 8m 0s.
- The new persistence flow restarts the app process three times (via
  `helpers/relaunch-and-open-checklist.yaml`) without clearing app data,
  confirming edits/reorder, an item deletion, and that an in-memory partial
  run is never recovered (template survives, a fresh run starts fully
  unchecked) all survive a real process kill and relaunch.
- **253 Jest tests**, TypeScript, and ESLint passed.

## Verified CheL-31 expansion — 2026-09-22

- Maestro 2.10.0; Java 17.0.5; `adb` 1.0.41 (37.0.0-14910828); Pixel 5
  emulator, Android 16 (API 36), `Pixel_5_API36` AVD.
- Two consecutive Android suite runs against a freshly built and installed
  Release APK: **3/3** flows passed each time, in 2m 34s and 4m 13s (the
  second run's longer time was Maestro/driver install overhead on that
  pass, not app behavior — no `-wipe-data` was used, and existing
  emulator/app data was preserved across both runs).
- The new `run-exit-system-back-android.yaml` flow confirmed the Android
  hardware/gesture system-back key triggers the same `usePreventRemove`
  confirmation dialog as the app Back button, with no confirmation bypass —
  the predictive-back risk flagged in planning (targetSdk 36, no
  `android:enableOnBackInvokedCallback` override) did not materialize, so no
  follow-up bug ticket was filed. See "Android divergences checked on the
  emulator" above for selector findings (none required changes).
- A regression run of the full iOS suite (13 flows) against a Release build
  on the iPhone 17 Pro / iOS 26.5 simulator passed **13/13** after this
  ticket's WU1 (appId/tags refactor) and WU2 (Android runner) changes,
  confirming no iOS behavior changed.
- **253 Jest tests**, **17 runner/guard contract tests**
  (`test_scenarios_ios.py`, `test_scenarios_android.py`,
  `test_maestro_flow_conventions.py`), and ESLint passed. No `src/` changes.
