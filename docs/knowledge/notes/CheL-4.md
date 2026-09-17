# CheL-4: Checklist runs

## Notes

- 2026-09-18: WU3's simulator smoke test (checklist → run → complete, plus the exit-confirmation dialog) had to be driven by the user tapping through the app manually — automated UI-driving tools (osascript/System Events) weren't available in this sandbox (no Accessibility permission), and no simulator-automation tool (e.g. Maestro, Detox) is set up in this repo. This is also what surfaced the WU2 back-button-reachability bug (couldn't have found it from unit tests alone, since RootNavigator's route options aren't unit-tested). Worth evaluating a scripted end-to-end tool (Maestro is a common lightweight fit for RN) so this class of smoke test can run unattended and repeatably instead of relying on a human driving the simulator each time.

## Debrief summary
