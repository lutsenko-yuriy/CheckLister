# CHL-2: Auto-assign Testers group on TestFlight upload

## Notes

## Debrief summary

### 2026-09-25

**What went well**
- Trivial-path workflow fit cleanly: single-line `pilot` config change, no plan/review-loop gates needed.
- Investigating the request surfaced a real, separate bug (TestFlight's "What to Test" never actually reaching testers due to `skip_waiting_for_build_processing`) — tracked independently as CHL-3 instead of scope-creeping into this ticket.

**What was hard or surprising**
- Nothing notable — the fix matched the ticket's stated scope exactly.

**What to change**
- Nothing to change.
