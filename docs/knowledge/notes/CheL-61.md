# CheL-61: iOS release pipeline: GitHub Actions CI + TestFlight automation

## Notes

- 2026-09-22: User asked whether this project should adopt the policy (used in other projects) of only bumping the version when a CHANGELOG entry carries `[user]`/`[app]` tags, instead of bumping on every merge regardless of tag. Currently `ship` SKILL.md step 2/4 bumps the version on every merge unconditionally (confirmed: versions 0.10.1–0.10.5 were all bumped for `[meta]`-only entries). Not currently documented or implemented that way in this project. Flagged for debrief discussion — a possible follow-up change to `skills/manage/ship/SKILL.md`, not part of CheL-61's scope.

## Debrief summary
