# CheL-30: Smoke tests: checklist persistence across app restarts

## Notes

## Debrief summary

### 2026-09-22

**What went well**
- Another self-directed ticket end to end: scoped, implemented the testID, wrote and iterated the Maestro flow across three real app restarts, verified twice on a real simulator, all without back-and-forth. The user's only involvement was reviewing the finished PR.

**What was hard or surprising**
- Reopening a checklist by text selector after a cold app relaunch (`stopApp`/`launchApp`) was consistently unreliable, even waiting 15-20s with `extendedWaitUntil`/`waitToSettleTimeoutMs` — the same text selector resolves fine immediately after in-JS creation. `maestro hierarchy` showed the row's merged accessible label (title + item count) living in a separate `accessibilityText` field rather than the `text`/`value` attributes Maestro's text selectors match, specifically post-relaunch. Switching to an `id`-based selector (a new `checklist-row-<title>` testID) resolved it immediately and reliably. Documented in `docs/SCENARIOS.md` so the next scenario ticket doesn't rediscover it.

**What to change**
- Nothing flagged — the mitigation for this ticket's friction is the documentation itself, not a workflow change.
