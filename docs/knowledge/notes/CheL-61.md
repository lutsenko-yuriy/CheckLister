# CheL-61: iOS release pipeline: GitHub Actions CI + TestFlight automation

## Notes

- 2026-09-22: User asked whether this project should adopt the policy (used in other projects) of only bumping the version when a CHANGELOG entry carries `[user]`/`[app]` tags, instead of bumping on every merge regardless of tag. Currently `ship` SKILL.md step 2/4 bumps the version on every merge unconditionally (confirmed: versions 0.10.1–0.10.5 were all bumped for `[meta]`-only entries). Not currently documented or implemented that way in this project. Flagged for debrief discussion — a possible follow-up change to `skills/manage/ship/SKILL.md`, not part of CheL-61's scope.

- 2026-09-23: User observed that this ticket, despite seeming like it would be token-heavy (multi-WU CI/CD pipeline, live GitHub Actions debugging loop with multiple failed runs), ended up consuming relatively little conversation context/tokens. Worth examining in debrief what made this efficient (e.g. planning done in a separate subagent whose full transcript stayed out of the main context, CI status polled via background Bash rather than inline waiting, fixes applied directly rather than through exploratory back-and-forth) so the pattern can be repeated deliberately on future tickets.

- 2026-09-23: First real end-to-end verification of the release pipeline (manual `workflow_dispatch` run, since 0.11.0's own automatic run was skipped by design — see the bug note below). Build, code signing, certificate/profile import, archive, and authenticated upload to App Store Connect all succeeded. The upload itself was rejected by Apple for a pre-existing, unrelated gap: `ios/CheckLister/Images.xcassets/AppIcon.appiconset/` has no actual icon image files, only `Contents.json` — the app has never had real App Store-ready icons. Filed as its own bug, #67, rather than expanding this ticket's scope. The pipeline is considered verified as far as it can be without that asset gap fixed.
- 2026-09-23: Found and fixed a real bug in `scripts/ci/release_gate.py` on the pipeline's very first live run: `docs/CHANGELOG.md`'s own template HTML comment contains a literal `## [X.Y.Z] ... (PR #N merged)` example heading, which `extract_newest_entry_tags()` matched as the first real entry heading instead of skipping it as a comment — caused the gate to fail loudly with "no recognised tag" despite the real `[app]` tag being present. Fixed by stripping HTML comments before scanning; added a regression test using the real comment text.

## Debrief summary

### 2026-09-23

**What went well**
- Overall the ticket went fine — brief → plan → multi-WU implementation → review/audit → ship flowed smoothly across all three WUs.

**What was hard or surprising**
- Waiting on and obtaining everything necessary for iOS publishing (App Store Connect API key, distribution certificate, provisioning profile, team ID) was the main friction point — but this is inherent to Apple's process, not something the workflow can shortcut.

**What to change**
- When presenting a Checklist-WU with [human] items that involve unfamiliar external portals/accounts, proactively offer a detailed step-by-step guide alongside the checklist instead of waiting for the user to ask. Applied to `docs/workflows/MULTI_WU.md`'s Checklist-WU section.
