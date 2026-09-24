# CHL-4: Add draft-release-notes skill, wire into ship

## Notes

- 2026-09-25: The `draft-release-notes` skill should have been part of the project from the very beginning rather than retrofitted after noticing generated TestFlight copy leaking ticket IDs/Markdown. (Moved here from CHL-3.md per the new note-relocation rule in `docs/workflows/FEATURE.md` — this observation is about CHL-4's scope specifically.)

## Debrief summary

### 2026-09-25

**What went well**
- Adapting the skill from `habit_loop` was quick — implementation itself was fast.

**What was hard or surprising**
- Opened this ticket and started working it in parallel with CHL-3 (still open) instead of confirming sequencing with the user first — ended up juggling two branches/PRs at once, which felt messy.
- That parallelism also caused a knock-on issue: notes about CHL-4 got filed under CHL-3's knowledge-base file because CHL-4's note file didn't exist yet when they were captured, and CHL-3 was the "active" ticket by session-context inference.

**What to change**
- When a user-initiated scope addition becomes its own ticket, default to starting it only after the current ticket ships instead of opening a second branch/PR immediately — only interleave if the user explicitly asks to. Added to `docs/workflows/FEATURE.md`'s "User-initiated scope additions" section.
- Move any `/note` entries captured under the wrong ticket (because the new ticket didn't exist yet) to the correct ticket's file once it's created. Same section, same doc.
