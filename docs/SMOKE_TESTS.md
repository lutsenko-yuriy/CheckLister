# Local iOS smoke tests

CheL-26 adds Maestro flows against the installed app and real native navigation.
Jest remains the unit/component test suite. These smoke tests are local only;
Android validation and CI integration are follow-up work.

## Tool choice

Maestro tests the installed simulator app through native UI interactions and YAML
flows without adding a test framework to the app binary. Detox offers app-aware
synchronization but requires additional native/test-runner setup. For these three
local smoke scenarios, Maestro keeps setup smaller. See the official
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
  -derivedDataPath /tmp/checklister-smoke-build CODE_SIGNING_ALLOWED=NO build
xcrun simctl install <UDID> \
  /tmp/checklister-smoke-build/Build/Products/Release-iphonesimulator/CheckLister.app
npm run smoke:ios -- <UDID>
```

Replace `<UDID>` everywhere with the same simulator identifier. Rebuild and
reinstall after app changes; the runner checks that the app exists, not that it
matches your checkout. A Debug app also works if Metro is already serving this
checkout, but Release is the reproducible default. Simulator/driver operations
need permission outside an agent's filesystem sandbox; they do not use macOS
System Events UI scripting.

## Coverage

| Flow | Assertions |
| --- | --- |
| `run-complete.yaml` | Empty checklist cannot start; completion disabled until all items checked; toggle/uncheck; completion returns to unchanged template; fresh run starts unchecked. |
| `run-exit.yaml` | Back shows confirmation; Cancel preserves progress; Discard returns to template; new run resets progress. |
| `run-gesture-ios.yaml` | Edge swipe navigates on an unprotected checklist screen (positive control); same swipe prompts before leaving an active run; Cancel preserves progress and interactivity; Back/Cancel/Discard and subsequent navigation still work. |

On the tested iOS 26.5 / react-native-screens 4.28.0 combination, swiping an active
run opens confirmation without removing the run. This matches the product spec.
Older source comments describe the gesture as disabled; the real-target test
intentionally asserts the observed dialog, Cancel, and continued interactivity.
Revalidate this behavior when upgrading native navigation dependencies.

Each flow cold-launches without clearing storage, creates a uniquely named
`Smoke <timestamp>-<random>` checklist via the UI, and deletes only that checklist
on success. Do not run the suite while using an unfinished in-memory run: launching
the app restarts its process. If a flow fails or is interrupted, its fixture can
remain for diagnosis; delete that specific `Smoke ...` checklist manually after
inspection. Existing checklists are never bulk-cleared. Run flows serially on a
single device; concurrent suites on that device would interfere.

## Results and diagnosis

The runner requires an explicit booted iOS UDID and installed CheckLister. It
returns Maestro's exit status unchanged (nonzero means failure), prints a unique
artifact directory under `artifacts/smoke-ios/`, and requests a JUnit report and
Maestro test artifacts there. `SMOKE_ARTIFACTS_DIR` overrides the parent directory.
Generated artifacts are gitignored. Inspect failure screenshots, command logs,
and the current hierarchy:

```bash
maestro --device <UDID> hierarchy
maestro --device <UDID> test .maestro/run-exit.yaml
```

Use labels/placeholders and progress text for selectors. The home screen exposes
`delete-checklist-<title>` on each Delete button because iOS flattens the list
accessibility hierarchy; parent/descendant matching can otherwise select a
different checklist. Fixtures have unique titles. The confirmation Delete is
scoped to the button group containing Cancel, because background buttons remain
in the native alert hierarchy. Avoid
fixed sleeps, optional assertions and retries that hide defects. Helpers live
under `.maestro/helpers/`; only top-level flows are discovered by the suite.

Runner contract tests use stub executables, not a simulator:

```bash
python3 -m unittest discover -s scripts/tests -p 'test_smoke_ios.py'
```

The contract checks these states before invoking Maestro:

| Arguments / target / app | Outcome |
| --- | --- |
| Missing or extra argument | Usage error, exit 2 |
| Unknown, non-iOS or shut-down simulator | Actionable error; no Maestro invocation |
| Installed app missing | Installation instructions; no Maestro invocation |
| Valid target and app | Run suite; retain Maestro success/failure status and artifacts |
