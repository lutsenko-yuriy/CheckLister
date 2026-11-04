# CheL-126: Add Firebase Analytics with opt-in consent

## Notes

## Debrief summary

### 2026-11-04

**What went well**
- The planned split held: Firebase and the kill-switches were known tickets from the start, and only the Settings screen (CheL-127) surfaced during briefing.
- The end result was worth the extra tickets.

**What was hard or surprising**
- One brief ended up as two follow-up tickets and a higher priority for an older one.
- The ~20 minute CI wait hurt as soon as the first PR opened and forced the CheL-115 detour.

**What to change**
- No workflow change: CheL-115 already moved the slow checks off PRs, so the wait that motivated "do the CI ticket first" is gone.
