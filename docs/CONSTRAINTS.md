# Project Constraints

Standing constraints to reference when evaluating trade-offs — especially in research tickets.

## Team & capacity

- **Solo developer + AI agents.** No dedicated support team, QA team, or second reviewer.
- **Agent resources are available; human support capacity is not.** Solutions that require ongoing human review must be sustainable by one person.

## Stage

- **Pre-public-launch, internal testing only.** Builds ship to TestFlight for internal testers via CI (`docs/VERSIONING.md`); promoting a build to public App Store review is always a manual, deliberate action taken directly in App Store Connect — never automatic. Optimise for simplicity and reversibility over scale.
- **Real-device QA is a distinct post-merge phase** (`docs/workflows/FEATURE.md`'s "In QA / testing" ticket state), not part of normal development.

## Devices

- **Only simulators/emulators are used during development.** `docs/SCENARIOS.md`'s Maestro runners explicitly reject physical-device serials ("physical-device support is out of scope"); real-device verification happens only in the separate In QA phase above.
- **Android's snapshot-isolation mechanism (#97) requires a "Google APIs" AVD system image, not "Google Play"** — the latter refuses `adb root`, which the mechanism depends on. See `docs/SCENARIOS.md`'s Android setup section.
- **Never run ad-hoc diagnostic device commands** (`adb shell`, `uiautomator dump`, `xcrun simctl`, etc.) **against a device while a Maestro suite is actively running against it.** Confirmed to hang a live run for ~1h47m (#97). Wait for the run to finish, or kill it first.
- **A Release build is never `run-as`-debuggable.** `adb shell run-as <app>` fails with "package not debuggable" against the Release APK this project's scenario suite always installs (#97) — any mechanism needing app-private storage access needs `adb root` instead.
