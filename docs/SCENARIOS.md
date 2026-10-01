# Local iOS and Android scenarios

CheL-26 adds Maestro flows against the installed app and real native navigation;
CheL-5 extends them with completed-run history coverage. CheL-31 adds an
Android emulator runner and system-back coverage alongside the existing iOS
suite. Jest remains the unit/component test suite. The local runners below are
the primary developer path; CheL-100 also runs the Android suite in CI — see
"CI (Android, CheL-100)".

Every top-level flow declares `appId: ${APP_ID}` (interpolated by Maestro from
the `-e APP_ID=...` runner flag, per platform bundle id) and a `tags:` list
(`ios`, `android`, or both) so `--include-tags <platform>` selects the right
subset. `scripts/scenarios-ios.sh` passes `-e APP_ID=com.checklister.checklisterApp
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
the project's JS dependencies, Java 17+, and Maestro CLI. **The system image
must be tagged "Google APIs", not "Google Play"** (check in Android Studio's
AVD selector, or `tag.id` in `~/.android/avd/<name>.avd/config.ini`) — CheL-97's
snapshot isolation mechanism (see "Isolating persistent test data" below)
needs `adb root`, which only a Google APIs (userdebug) image permits; a
Google Play image refuses it. `adb` must resolve either on `PATH` or under
`$ANDROID_HOME`/`$ANDROID_SDK_ROOT`'s `platform-tools/` —
`scripts/scenarios-android.sh` falls back to that path when `adb` is not on
`PATH` directly (this shell does not export `ANDROID_HOME` by default):

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
npm run scenarios:snapshot:android -- <serial>  # optional: seed a baseline first — see "Isolating persistent test data" below
npm run scenarios:android -- <serial>
```

Replace `<serial>` everywhere with the `adb devices` serial (e.g.
`emulator-5554`). A serial must both appear in `adb devices` as `device`
(not `offline`/`unauthorized`) and match `emulator-*` — the runner rejects a
physical-device serial the same way. On first run per emulator, Maestro
installs its own driver/server APKs; that is inherent to the tool and does
not affect app data.

## Sharding the suite across devices (CheL-105)

Both runners accept a comma-separated device list in place of a single
UDID/serial — `npm run scenarios:ios -- "<udid1>,<udid2>"` or
`npm run scenarios:android -- "<serial1>,<serial2>"` — and split the suite
across them via Maestro's own `--udid`/`--shard-split`, derived from the
device count (never caller-supplied: there's no reason to shard N devices
into a different number of shards). A single device is unaffected — that
invocation is byte-for-byte the same command as before this ticket.

Each device restores its own snapshot (keyed by its own UDID/AVD name, same
mechanism as the single-device case) before Maestro starts on any of them —
a sharded run's isolation guarantee only holds if every device that
executes real flows started from its own restored baseline. **Capture a
snapshot for every device you intend to shard across** — an un-snapshotted
device runs unprotected exactly like an un-snapshotted single device would,
so a flow that fails and leaves residue on it can break the next flow on
the same device (confirmed during verification below).

**Sharded runs write debug artifacts (screenshots, hierarchy, logs)
differently from single-device runs**: `--test-output-dir` is not used for
a sharded run (`--format junit --output <path>` still produces the combined
JUnit report there), and Maestro instead writes each flow's full debug
output to its own default location, `~/.maestro/tests/<timestamp>/<flow
name>-shard-<N>/`. Look there, not under `artifacts/`, when diagnosing a
sharded-run failure.

## CI (Android, CheL-100)

`.github/workflows/scenarios-android.yml` ("Android scenarios") runs the
Android-tagged suite on every PR to `main` that touches app-affecting paths
(`src/`, `.maestro/`, `android/`, JS/Babel/Metro config, `package*.json`,
`patches/`, the Android runner scripts, the workflow itself), and on demand:

```bash
gh workflow run "Android scenarios" --ref <branch>
```

It builds the Release APK for `x86_64` only, boots an API 36 `google_apis` /
`pixel_5` emulator on a KVM-accelerated `ubuntu-latest` runner via
`reactivecircus/android-emulator-runner`, installs the APK, and runs the same
`npm run scenarios:android -- emulator-5554` as locally. It also runs on
pushes to `main` touching the same paths, to keep the README badge current.
`scripts/tests/test_android_scenarios_workflow.py` pins these choices.

- **Image parity.** API 36 / Pixel 5 matches `Pixel_5_API36`, the only AVD the
  suite is verified on locally (API 29 failed in CheL-105). `google_apis`,
  never Play, per `docs/CONSTRAINTS.md`. Animations stay on, matching every
  local baseline and #110's timing tuning.
- **No snapshot.** A fresh CI emulator plus a fresh install is already a clean
  baseline; the runner prints "No snapshot found" and continues.
- **Serial, not sharded.** The repo is public, so standard runners are free
  and sharding could only buy wall-clock time. Two emulators on one 4-vCPU
  runner would contend for CPU (CheL-105 saw contention-only failures on a
  faster Mac). Revisit past ~12 Android flows or ~20 min of suite time — via a
  job matrix across separate runners, not more emulators per runner.
- **Informational.** Not a required check (`main` has no branch protection).
  FEATURE.md step 10.6 still requires it green, or flagged flaky after three
  attempts, before a review loop closes. Promoting it to required needs a
  job-level path filter (like `pr-validation.yml`'s `changes` job) instead of
  the trigger-level `paths:`, or docs-only PRs would sit on a pending check.
- **Results.** Every run publishes an "Android scenario flows" check listing
  each flow's pass/fail (`dorny/test-reporter`, from Maestro's JUnit report),
  and a per-flow table on the run page (`scripts/ci/scenarios_report.py
summary`). Runs on pushes to `main` also update the README's "Android
  scenarios" badge: a shields.io endpoint read from the public gist in the
  `SCENARIOS_GIST_ID` repo variable, written with the `GIST_TOKEN` secret (a PAT
  with gist write). PR runs never touch the badge. Without the secret, the badge
  step skips and the badge keeps its last value. A run with no report is never
  green: red "failed" if the job failed first (for example the build), otherwise
  grey "no results". A run cancelled by a newer `main` push leaves the badge
  alone.
- **Speed.** A green run takes ~19–24 min, about half of it the cold
  `assembleRelease`. Optimizing it is tracked in CheL-115.
- **Diagnosis.** The `scenarios-android` artifact (JUnit `report.xml`, per-flow
  `maestro.log`, screenshots, hierarchy) uploads on every run. On failure it
  also holds `logcat.txt`, dumped only after Maestro exits (never alongside
  it — `docs/CONSTRAINTS.md`), and the job log has a host `dmesg` step.

## Coverage

CheL-36 adds two installed-app contracts for cold and foreground external-run
links. CheL-40 adds three more for the `checklister://select` picker: an
invalid cold callback, a failed callback delivery, and a select request
arriving during an active run. Valid-checklist external-run/-select completion and cancellation remain
component integration scenarios; CheL-34's snapshot mechanism (see
"Isolating persistent test data" below) makes a deterministic, known
checklist ID available at the installed-app level (seed it once, capture it,
restore it every run), but promoting these flows to real Maestro coverage
is separate, unstarted follow-up work.

`run-complete.yaml`, `run-exit.yaml`, `run-history.yaml`, and
`run-history-discard.yaml` run on both platforms (`tags: [ios, android]`);
`run-exit-system-back-android.yaml` is Android-only, covering what the
app-level Back button flow cannot: the hardware/gesture system-back key.
Restart persistence has one flow per platform (`checklist-persistence-restart-ios.yaml`
/ `-android.yaml`); the Android copy retry-wraps its drag step (CheL-110).
Every other flow below is iOS-only (edge-swipe gestures, item editing,
drag-reorder, and external-link handling stay iOS-only until a dedicated
ticket promotes them).

| Flow                                         | Assertions                                                                                                                                                                                                                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run-complete.yaml`                          | Empty checklist cannot start; completion disabled until all items checked; toggle/uncheck; completion returns to unchanged template; fresh run starts unchecked.                                                                                                                       |
| `run-exit.yaml`                              | Back shows confirmation; Cancel preserves progress; Discard returns to template; new run resets progress.                                                                                                                                                                              |
| `run-exit-system-back-android.yaml`          | Android system back (hardware/gesture) during an active run shows the same confirmation as the app Back button; Cancel preserves progress and keeps the screen interactive; a second system back Discards and resets on the next run.                                                  |
| `run-gesture-ios.yaml`                       | Edge swipe navigates on an unprotected checklist screen (positive control); same swipe prompts before leaving an active run; Cancel preserves progress and interactivity; Back/Cancel/Discard and subsequent navigation still work.                                                    |
| `run-history.yaml`                           | A completed run exposes filtered and global history, keeps its snapshotted item count after the checklist changes, and remains globally visible after checklist deletion.                                                                                                              |
| `run-history-discard.yaml`                   | Cancelling an exit preserves progress, while discarding one or more runs never exposes checklist history.                                                                                                                                                                              |
| `external-run-invalid-callback-ios.yaml`     | A cold `checklister://run` launch rejects an invalid callback, explains the problem, and leaves the home screen usable.                                                                                                                                                                |
| `external-run-callback-failure-ios.yaml`     | A link delivered immediately after launch returns an error for a missing checklist, reports failed callback delivery, and preserves existing simulator data.                                                                                                                           |
| `external-select-invalid-callback-ios.yaml`  | A cold `checklister://select` launch rejects an invalid callback, explains the problem, and leaves the home screen usable without opening the picker.                                                                                                                                  |
| `external-select-callback-failure-ios.yaml`  | A foreground select link opens the picker; picking a checklist with an undeliverable callback reports failed callback delivery and returns to a usable home screen.                                                                                                                    |
| `external-select-during-run-ios.yaml`        | A foreground select link during an active run pushes the picker above it; cancelling the picker returns to the run with its progress intact.                                                                                                                                           |
| `checklist-item-editing-ios.yaml`            | Editing an item and saving replaces its text while the other item is unchanged; editing and cancelling preserves the original text; clearing an item's text and saving leaves it unchanged (current spec: empty edits are ignored); a run started afterward shows the saved item text. |
| `checklist-drag-reorder-ios.yaml`            | Dragging an item down and then another one up reorders the checklist each time; a run started afterward lists items in the saved order.                                                                                                                                                |
| `checklist-persistence-restart-ios.yaml`     | An item edit, a drag reorder, and an item deletion each survive an app relaunch; an active run (in-memory only) is not recovered after a mid-run relaunch, the template is unaffected, and a fresh run starts unchecked.                                                               |
| `checklist-persistence-restart-android.yaml` | Same assertions as the iOS flow; the drag step and its order assertions are wrapped in `retry` (`maxRetries: 3`) to absorb Android's drag-activation race (CheL-110).                                                                                                                  |

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
single device; concurrent suites on that device would interfere. The same
holds for ad-hoc diagnostic commands (`adb shell`, `uiautomator dump`,
`xcrun simctl`, etc.) issued against a device while a suite is actively
running against it — CheL-97 saw a live Maestro run hang for ~1h47m after a
concurrent diagnostic `adb`/`uiautomator` call interfered with its driver
connection. Wait for a run to finish (or kill it first) before touching the
device directly.

## Isolating persistent test data (CheL-34)

`run-history.yaml` (and any future persistent scenario-owned record) can't be
cleaned up through the product UI: completed-run history deletion is
intentionally not part of the app. Rather than parsing AsyncStorage's on-disk
format directly (an undocumented, version-fragile internal), isolation works
one level up, on the app's own sandboxed data directory as a whole:

1. **Capture a baseline once**: after seeding whatever unrelated checklists
   or history you want the suite to always see on this simulator, run
   `npm run scenarios:snapshot:ios -- <UDID>`. This terminates the app,
   resolves its container via `xcrun simctl get_app_container <UDID>
com.checklister.checklisterApp data`, and `rsync -a --delete`s it into
   `artifacts/scenarios-ios/snapshot/<UDID>/` (gitignored), excluding
   `Library/Caches` (regenerable, irrelevant to isolation correctness — keeps
   the snapshot smaller). Re-run it any time you want to refresh that
   baseline.
2. **Every suite run restores that baseline first, not after**:
   `npm run scenarios:ios` checks for a snapshot for the selected device
   before invoking Maestro; if one exists, it terminates the app and
   `rsync -a --delete`s the snapshot back onto the live container (same
   `Library/Caches` exclusion, so restore never wipes the container's
   regenerable cache), so the suite always starts from the identical
   baseline the snapshot captured for everything else — no `Scenario ...`
   history entries or checklists from a prior run can ever accumulate. If no
   snapshot has been captured yet for that device, the runner says so and
   proceeds without restoring, so first-time use is unaffected.
3. **Failure diagnosis is unaffected, and easier**: because restore happens
   before a run rather than clearing up after one, a failed run's on-device
   state — its fixture checklist, any history it created, an in-progress
   run — is left exactly as the failure produced it. Inspect it directly on
   the simulator; the _next_ invocation's restore step is what eventually
   clears it, not this one.

This isolates the whole app sandbox, not just `runHistory`, so it covers any
future persistent scenario-owned record with no per-record cleanup logic to
maintain.

**Android (CheL-97)** follows the identical restore-before-run lifecycle,
capture-once/restore-always semantics, and gitignored artifact layout, but a
different transport: Android app-private storage (`/data/data/<app>`) isn't
host-readable the way an iOS simulator's container is, so there's no local
directory for `rsync` to sync against directly. `run-as` (the usual
no-root way to reach app-private storage) doesn't work here either — it
requires a debuggable build, and this suite always installs a Release APK
(CheL-97 confirmed: `run-as` fails with `package not debuggable` against
it). `adb root` is the actual mechanism instead — see the Android setup
section above for the Google APIs system-image requirement this implies.

1. **Capture a baseline once**: `npm run scenarios:snapshot:android -- <serial>`
   force-stops the app, then `adb exec-out tar`s `/data/data/com.checklister`
   (as root) into a single tar file at
   `artifacts/scenarios-android/snapshot/<AVD name>.tar` (gitignored),
   excluding `cache` and `code_cache` (the `Library/Caches` analogue) and
   `lib` (a native-library symlink on API levels where it exists under
   app-private storage at all — confirmed absent on API 36; excluding it is
   harmless either way, since it belongs to the install, not the data).
   Written atomically (a temp file, then renamed into place) so an
   interrupted capture can't leave a later run restoring a truncated
   snapshot.
2. **Keyed by AVD name, not the emulator serial**: `emulator-5554` is a
   port, not a stable identity — it's reused by whatever AVD boots first
   and changes for the same AVD across reboots, so a serial-keyed snapshot
   would risk silently restoring one AVD's data onto a different AVD's.
   `adb -s <serial> emu avd name` resolves the stable identity instead;
   if that ever fails to resolve (falls back to the serial with a printed
   warning) rather than erroring.
3. **Every suite run restores that baseline first, not after** — same
   shape as iOS: `npm run scenarios:android` checks for a snapshot keyed
   to the selected emulator's AVD name before invoking Maestro, force-stops
   the app, deletes an explicit allowlist (`files`, `databases`,
   `shared_prefs`, `no_backup` — the `rsync -a --delete` equivalent, so a
   record from a failed prior run can't survive into the next), pushes the
   snapshot tar to `/data/local/tmp/` and extracts it in place as root
   (ownership is preserved automatically — no `chown` needed), then removes
   the staged tar. If no snapshot exists yet for that AVD, the runner says
   so and proceeds without restoring, same as iOS.

**Known flakiness (unrelated to this mechanism):** during CheL-97's
verification, one of three consecutive full-suite runs saw 3 flows fail at
`helpers/create-checklist.yaml`'s very first assertion
(`assertVisible: New checklist title`) immediately after a cold app launch —
but the failure screenshot for each showed the home screen already correctly
rendered with that exact text visible, and the same failure hit
`run-exit-system-back-android.yaml` (a flow this ticket never touched)
identically. This is a pre-existing assertion-timing race on Android cold
launch, not a snapshot-restore defect — the other two runs (including one
directly before and one directly after the flaky run, same snapshot, same
mechanism) passed 5/5. Re-run once if a suite fails only on an early
`create-checklist.yaml` assertion before assuming a real regression.

**Update (CheL-104, 2026-09-28):** the full-suite anecdote above undersells
the per-launch-opportunity rate. Standalone probing of
`checklist-persistence-restart-ios.yaml` — a flow that cold-launches/
relaunches three times in one run via `helpers/create-checklist.yaml` and
two calls to `helpers/relaunch-and-open-checklist.yaml` — hit this same
race on 7 of 20 standalone runs (35%), across two different swipe-duration
configurations unrelated to the race itself. Any other Android flow using
either helper is equally exposed each time it launches/relaunches. Root
cause and a real fix (versus "known flaky, re-run") tracked in #110.

**Resolved (CheL-110, 2026-09-28):** confirmed as a structural timing-margin
issue, not rare flakiness — the emulator's cold-start-to-interactive latency
averages ~5.5-10s (measured post-first-frame vs. raw process-start
respectively) with a fat tail up to 13-16s, sitting right at/above Maestro's
7s `assertVisible` default. Both helpers now use `extendedWaitUntil` with a
20000ms timeout on the `New checklist title` check instead of a bare
`assertVisible` (which has no timeout field of its own). A standalone probe
mirroring the flow above (3 cold-launch/relaunch opportunities, no drag
step) ran 15/15 clean (60/60 opportunities) after the fix, versus the ~35%
baseline. See `docs/knowledge/notes/110.md` for the full probe data.

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
maestro --device <UDID> test -e APP_ID=com.checklister.checklisterApp .maestro/run-exit.yaml
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
vertical offset above the list).

CheL-98 found two compounding problems with the original `duration: 4000`
percentages: one swipe's start coordinate (`48%`) silently missed its
target drag-handle by ~7.5pt on a 402x874pt screen — Maestro reported the
swipe as `COMPLETED` while the app received no touch on the handle at all,
so nothing moved — and even once corrected to land on the handle's
measured center, the drag still failed to activate in roughly a third of
runs at `4000`/`8000ms`, a residual `activateAfterLongPress(200)` race
(Maestro's `swipe` has no stationary hold before it starts interpolating
toward the end point, so how much the touch has moved by the 200ms mark is
timing-dependent, not purely a function of the coordinates). `duration:
12000` on both swipes cleared this reliably (10/10 standalone runs plus a
full-suite pass, split across an iPhone 17 and an iPhone 17 Pro simulator).
CheL-105 WU2 later re-probed once the coordinate fix was in place and found
`8000ms` sufficient (see "Verified CheL-105 WU2" below) — the flow's
current committed value is `8000ms`, not `12000ms`.
Maestro reporting a `swipe`/`tapOn` as completed is therefore not
sufficient evidence the app actually received the gesture — a silent no-op
swipe only surfaces via the following order assertion, so pull the
`screen-hierarchy` debug artifact to check actual element bounds before
assuming a coordinate is correct.

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

## Verified CheL-98 fix — 2026-09-26

- `checklist-drag-reorder-ios.yaml` was intermittently/deterministically
  failing (see "Real drag-to-reorder" above for the root cause: a
  coordinate miss plus a residual gesture-activation timing race).
  `duration: 12000` on both swipes, with the second swipe's start
  coordinate corrected from `48%` to `50%`, passed **10/10** standalone
  runs split across an iPhone 17 and an iPhone 17 Pro simulator (402x874pt,
  same logical resolution on both), plus a full 13-flow suite run
  (**13/13** passed, 8m 8s) on a Release build.
- CheL-98 also reported an intermittent swallowed tap on
  `run-complete.yaml`/`run-history.yaml`'s "Complete the checklist" button,
  hypothesized as a lingering keyboard-dismiss gesture. Not reproduced in
  this investigation (9 runs across the same two simulators/builds) — left
  open in the ticket pending further evidence rather than an unverified
  code fix.
- ESLint and the `test_maestro_flow_conventions.py` contract test passed.
  No `src/` changes.

## Verified CheL-105 WU1 (sharding) — 2026-09-27

- **iOS**: a real sharded run across an iPhone 17 and an iPhone 17 Pro
  simulator (`npm run scenarios:ios -- "<udid1>,<udid2>"`) correctly
  produced `--udid "<udid1>,<udid2>" --shard-split=2`, split 13 flows into
  7/6, and restored each simulator's own snapshot independently (one
  printed "Restoring app data from snapshot", the other "No snapshot
  found", matching which simulator actually had one captured) — **293.7s**
  total wall time, versus a same-session single-device baseline of
  **13/13 passed in 8m 18s (498s)**, a **41% reduction**, consistent with
  CheL-102's earlier 45% measurement. One flow
  (`checklist-persistence-restart-ios.yaml`) failed only in the sharded
  run; confirmed clean when re-run standalone immediately after, so this
  is resource contention from two simulators running concurrently, not a
  sharding-logic defect — expect occasional single-flow flakiness from
  contention on a loaded machine, distinct from a real regression.
  Single-device path re-verified with zero changes to its own contract
  tests or command shape: **13/13 passed, 8m 18s**.
- **Android**: `--udid` accepts comma-separated emulator serials the same
  way it accepts iOS UDIDs (previously unverified). A real sharded run
  across two concurrently-booted "Google APIs" AVDs (`Pixel_5_API36` +
  `API29_CI_Match`, both required per the Android setup section above)
  correctly derived `--shard-split=2` and restored each serial's own
  AVD-keyed snapshot independently. First attempt (no snapshot yet
  captured for `API29_CI_Match`) demonstrated exactly the residue risk the
  "capture a snapshot for every device" warning above describes: a failed
  flow left two leftover checklists that broke the next flow on the same
  unprotected device. After capturing a proper baseline for both AVDs,
  `Pixel_5_API36`'s shard passed except for one contention-flaky flow
  (matching the iOS pattern, confirmed clean standalone: **5/5 passed,
  5m 28s**), but **`API29_CI_Match` (Android 10) failed the same
  `"Start run", disabled` assertion consistently (2/2), even from a clean
  snapshot** — a real, reproducible flow/API-level compatibility issue on
  that specific AVD, unrelated to sharding and out of this WU's scope.
  Recommend sharding Android runs across AVDs already known to pass the
  suite individually (`Pixel_5_API36` is), rather than an untested older
  API level; flag `API29_CI_Match`'s failure as a candidate for its own
  investigation ticket if that AVD needs to be a supported target.
- `python3 -m unittest discover -s scripts/tests` — 81/81 pass (10 new
  multi-device/sharding contract tests across both platforms; every
  pre-existing test passes unmodified). `npm run lint` clean. No `src/`
  changes.

## Verified CheL-105 WU2 (swipe-duration floor) — 2026-09-27

- Re-probed `checklist-drag-reorder-ios.yaml`'s two swipe `duration` values
  now that CheL-98's coordinate fix (the `48%`→`50%` handle-center
  correction) is in place, since that fix removed the _positional_ miss
  that CheL-98's original `12000ms` choice had to cover for alongside the
  gesture-activation timing race — the two problems were compounding, and
  fixing one meant the other's margin needed re-measuring rather than
  assuming `12000ms` was still the minimum required.
- Probed on an iPhone 17 simulator, 10 standalone runs per value:
  `10000ms`, `9000ms`, and `8000ms` each passed **10/10**. `4000ms` (one of
  CheL-98's two originally-flaky values) failed **9/10** — the residual
  `activateAfterLongPress(200)` race is still real, just with a much lower
  floor than `12000ms` once the coordinate miss stopped compounding it.
- Committed **`8000ms`** on both swipes: the lowest clean value probed,
  with a 4000ms margin over the nearest known-failing value (well past the
  1000ms floor this WU's plan required). Did not narrow further between
  `4000ms` and `8000ms` — the margin requirement was already satisfied and
  tighter values shrink the buffer without shrinking suite time by a
  useful amount.
- Closed with one full 13-flow suite run on the committed value:
  **13/13 passed, 8m 9s** (drag-reorder flow itself: 50s, down from the
  `12000ms` baseline).
- No `src/` or contract-test changes — this WU is a Maestro-flow data
  change only.

## Verified CheL-104 — 2026-09-28

- Investigated `checklist-persistence-restart-ios.yaml` and
  `run-gesture-ios.yaml` for Android equivalents, on `Pixel_5_API36`
  (gesture-navigation mode confirmed via `navigation_mode=2`) plus an
  iPhone 17 Pro simulator.
- **`checklist-persistence-restart-ios.yaml`**: the flow's own drag swipe
  hits the identical `activateAfterLongPress(200)` race CheL-105 WU2
  probed for `checklist-drag-reorder-ios.yaml` — confirmed via a
  screen-hierarchy bounds check that the swipe's start coordinate lands
  correctly on the drag handle both times it fails, ruling out a selector
  issue. Raised `duration: 4000 -> 8000`, matching CheL-105 WU2's iOS
  floor: **10/10 standalone on iPhone 17 Pro.** Android did not clear the
  race at the same bar: 8000ms scored 2/10 genuine drag-order failures
  (plus 3/10 unrelated cold-launch/relaunch failures, see "Known
  flakiness" update above); a further probe at 12000ms scored 1/10 drag
  failures (plus 4/10 cold-launch/relaunch). **`checklist-persistence-restart-android.yaml`
  is not added** — Android's drag-activation margin and the cold-launch/
  relaunch race frequency both need their own investigation, tracked in
  #110. The iOS `8000ms` fix ships regardless (validated standalone,
  independent of the Android outcome).
- **`run-gesture-ios.yaml`**: an edge swipe (`0%,50% -> 90%,50%`) on
  `ChecklistDetail` navigated back to Home on Android — the system
  predictive-back gesture region is reachable via Maestro's synthetic
  swipe in gesture-navigation mode. The same swipe during an active run
  produced the identical `usePreventRemove` "Are you sure? / CANCEL /
  DISCARD" dialog `run-exit-system-back-android.yaml`'s `back`-key path
  already asserts — byte-for-byte the same copy. **No new
  `run-gesture-android.yaml`** — this is a deliberate conclusion: both
  paths reach the same app-level `beforeRemove` callback, so there is no
  distinct Android navigation-gesture behavior left uncovered. 3-button
  navigation mode was not probed.
- No `src/` changes. Full findings and raw per-run evidence in
  `docs/knowledge/notes/104.md`.

## Verified CheL-110 (drag-activation half) — 2026-09-29

- #110's cold-launch/relaunch half shipped separately (see the `[test] #110`
  CHANGELOG entry). This closes the remaining drag-activation-race half,
  which had left `checklist-persistence-restart-android.yaml` unshipped
  since CheL-104 (8000ms: 2/10 drag-order failures; 12000ms: 1/10 —
  raising `duration` further plateaus rather than reaching 0, and #110's
  own earlier investigation ruled out a true hold-then-move gesture as
  untestable with current tooling).
- Wrapped the flow's drag swipe (`duration: 8000`, matching the iOS/other
  Android flows' floor) and its two order assertions in Maestro's native
  `retry` command (`maxRetries: 3` — 0-3 is the documented range). A
  failed attempt leaves either a no-op or an adjacent-slot swap; either
  way the wrapped assertions only pass on the true final order, so a
  retry starting from an already-wrong layout still fails and retries
  again rather than producing a false pass.
- Added `checklist-persistence-restart-android.yaml` (Android tag) and
  verified on `Pixel_5_API36`: **10/10 full-flow runs passed** (each with
  3 relaunches plus the retry-wrapped drag), with the drag succeeding on
  its first attempt in all 10 — consistent with 8000ms's already-measured
  ~80-90% single-attempt rate.
- Separately confirmed the `retry` block itself works when actually
  needed: a throwaway variant with `duration: 2000` (a known near-0%
  floor) exhausted all 4 attempts (1 + 3 retries) and failed cleanly in
  5/5 stress runs — screen-hierarchy dumps across all 4 attempts showed
  the same unchanged item order each time (a clean no-op, not a
  compounding partial-swap), confirming a failed attempt doesn't corrupt
  state for the next retry.
- One false lead during this investigation: an early run showed an item's
  text rendering truncated (`"Scenario second"` → `"Scenario"`) across
  all 4 retry attempts, alongside a stray floating IME overlay and,
  shortly after, a "Process system isn't responding" ANR dialog — a
  degraded emulator after a long session, not an app bug. A clean restart
  (`adb emu kill` + relaunch) reproduced the same steps with no
  truncation. Full narrative in `docs/knowledge/notes/110.md`.
- ESLint, `tsc --noEmit`, the full Jest suite, and
  `test_maestro_flow_conventions.py` all pass. No `src/` change — this is
  a new Maestro flow file only.

## Verified CheL-100 (Android scenarios in CI) — 2026-09-30

Six runs of `.github/workflows/scenarios-android.yml` on PR #114
(`ubuntu-latest`, API 36 / `google_apis` / `pixel_5`, KVM):

| Run | Build APK | Emulator + suite | Total   | Flows                              |
| --- | --------- | ---------------- | ------- | ---------------------------------- |
| #1  | 10m 08s   | 4m 33s           | 15m 18s | 1/6: emulator lost, see below      |
| #2  | 10m 05s   | 10m 24s          | 21m 03s | 6/6 (suite 7m 55s)                 |
| #3  | ~10m      | ~9m              | 19m 12s | 6/6 (suite 7m 18s)                 |
| #4  | ~10m      | ~9m              | 20m 40s | 6/6 (suite 7m 55s)                 |
| #5  | ~10m      | ~10m             | 21m 31s | 5/6: item text truncated, CheL-116 |
| #6  | ~10m      | ~12m             | 23m 53s | 6/6 (suite 10m 29s)                |

- **Run #1's failure was the environment, not a flow.** About 2 min into the
  suite, right after the first flow passed, adb reported the emulator as
  `device offline`. The next flow's very first call (clearing logcat) already
  failed, and the other five errored in under 150 ms each (`Unknown error`,
  `DeviceServerDiedException ... UNAVAILABLE` in `maestro.log`). The emulator
  process itself stayed up (`emu kill` succeeded afterwards). It hasn't
  recurred in runs #2–#4. The post-run `logcat.txt` and `dmesg` diagnostics
  were added so a recurrence shows why, instead of guessing from one sample.
- **Run #5 failed on an app-or-input issue, not on the CI wiring.** In
  `run-exit-system-back-android`, the second item was saved as "Scenario"
  instead of "Scenario second". That's the same truncation `notes/110.md`
  wrote off as a degraded long-running emulator, now seen on a fresh one.
  Tracked in CheL-116. The re-dispatch (run #6) passed 6/6, though its
  `run-history` took 4m 02s against its usual ~1m 15s.
- Run #5 also showed that `fail-on-error: false` left the "Android scenario
  flows" check green despite a failed flow. It's now left at its default, and a
  contract test pins that.
- Per-flow times on the runner are ~1.5–2.5× local (for example
  `run-complete` 1m 27s–1m 41s vs ~38s locally); text entry dominates.
- Run #4 also verified reporting: the "Android scenario flows" check showed
  "6 passed, 0 failed", the run-summary table was written, and the badge step
  skipped as intended on a PR run. The badge's first real update happens on
  the first push to `main` after merge.
- The Gradle cache is never warm on PR runs yet: `setup-gradle` only writes
  from `main`. Speeding up the workflow is CheL-115.
