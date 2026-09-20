---
bookmarks: [real-device-only-bugs]
---

# CheL-4: Checklist runs

## Notes

- 2026-09-18: WU3's simulator smoke test (checklist → run → complete, plus the exit-confirmation dialog) had to be driven by the user tapping through the app manually — automated UI-driving tools (osascript/System Events) weren't available in this sandbox (no Accessibility permission), and no simulator-automation tool (e.g. Maestro, Detox) is set up in this repo. This is also what surfaced the WU2 back-button-reachability bug (couldn't have found it from unit tests alone, since RootNavigator's route options aren't unit-tested). Worth evaluating a scripted end-to-end tool (Maestro is a common lightweight fit for RN) so this class of smoke test can run unattended and repeatably instead of relying on a human driving the simulator each time.

## Debrief summary

### 2026-09-18

**What went well**
- The multi-WU split (WU1 domain/state → WU2 run screen → WU3 entry point) kept each PR small and independently reviewable; no rework was needed across WU boundaries.
- The review/audit loop caught a real defect early: the Run screen's exit-confirmation lock was unreachable on iOS (no back affordance at all), and the first fix attempt introduced a second real bug (swipe gesture desyncing JS/native navigation state) that the audit flagged as a residual risk before it was even manually confirmed.

**What was hard or surprising**
- Simulator smoke-testing required the user to manually tap through the app screen-by-screen (no UI-automation tool available in this sandbox) — this is what surfaced both the reachability bug and the swipe-gesture desync, but it was slow and repetitive across several screenshot round-trips.

**What to change**
- Filed [issue #26](https://github.com/lutsenko-yuriy/CheckLister/issues/26) to evaluate a scripted UI-automation tool (e.g. Maestro) so this class of smoke test can run unattended and repeatably instead of relying on a human driving the simulator each time.
