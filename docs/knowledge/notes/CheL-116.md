---
bookmarks: [async-lifecycle-races]
---

# CheL-116: Android scenario item text truncated at space ("Scenario second" → "Scenario")

## Notes

- 2026-10-01: Root cause is an app bug, not Maestro input. CI run #5's logcat showed Gboard received every key of "Scenario second" plus ENTER, with the same IME event pattern as the passing "Scenario first" item. Temporary `console.warn` instrumentation (release APK, `Pixel_5_API36`, Gboard) showed that on Enter, Gboard's autocorrect replaces the composing word with two native change events in the **same millisecond as `onSubmitEditing`**: `"Scenario "` (word deleted), then `"Scenario Second"` (replacement inserted). `handleAdd` read React state (`newItemText`), so it saw whichever render had committed last: the pre-autocorrect `"Scenario second"` (11/15 submits on an idle emulator) or, under 6 CPU busy-loops, the mid-replacement `"Scenario "` (1/15), which trims to "Scenario", the exact CI symptom. `HomeScreen`'s new-checklist title had the identical pattern.
- Fix: `onSubmitEditing={e => handleAdd(e.nativeEvent.text)}` in both screens; the Add button keeps using state (a tap happens after events settle). Verified 45/45 adds under load with no truncation, the iOS suite 13/13, and Android CI 6/6. Saved text now follows Gboard's autocorrect ("Scenario Second"); Maestro text matching is case-insensitive, so existing `.*Scenario second.*` selectors still match. Added a `CODE_STYLE.md` smell entry for the pattern.
- CheL-110's "false lead" (truncation + IME overlay + ANR on a long-running emulator, gone after `adb emu kill`) was this same race. A slow device widens the window, and a clean device narrows it.
- The first PR CI run failed all 6 flows on a "System UI isn't responding" ANR dialog covering the (correctly launched) app, then passed 6/6 on the first re-dispatch. That's a CI-emulator flake class worth bearing in mind for CheL-115.

## Debrief summary

### 2026-10-02

**What went well**
- Evidence-first investigation: CI logcat ruled out Maestro input, and on-device instrumentation proved the race before any fix was written. The user confirmed the overall run went well.
- TDD component tests encoded the exact race (stale state + different native text on submit).

**What was hard or surprising**
- The exact truncation only reproduced under artificial CPU load. CheL-110 had dismissed the same symptom as a degraded emulator because a clean relaunch didn't show it.
- The bug was user-facing beyond the scenario suite: with autocorrect, the field showed the corrected text while the uncorrected text was saved.

**What to change**
- `docs/workflows/TROUBLESHOOT.md`: a symptom that vanishes on a clean device isn't proof of a degraded environment; reproduce under artificial load with targeted logging first.
