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

**Release-note drafting (added during `ship`)**
- The first drafted `[user]` bullet had four sentences (storage, languages, "no setting yet") and was reassuring in tone; I reported it as passing the checklist when it failed items 4, 5 and 7. The approved bullet is one sentence about what changed for the user.
- Ticket numbers do not belong in user bullets (internal). `ship`'s template shows `[user] CheL-XX:` while the checklist (item 3) forbids ticket numbers: the two should agree. Noted, not changed.

**What to change**
- No workflow change: CheL-115 already moved the slow checks off PRs, so the wait that motivated "do the CI ticket first" is gone.
