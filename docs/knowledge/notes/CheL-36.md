---
bookmarks: [async-lifecycle-races, agent-model-calibration]
---

# CheL-36: Externally started checklist runs with callback results

## Notes

- 2026-09-19: Several race-condition bugs were found during implementation, particularly around asynchronous run completion, replacement, persistence, and callback delivery. For future features with overlapping asynchronous state transitions, explicitly model and test race scenarios during planning and implementation rather than relying on the review round to uncover them.

## Debrief summary

### 2026-09-20

**What went well**
- Splitting the feature into four work units kept a large cross-platform change
  readable and reviewable.
- Repeated architecture reviews, runtime audits, and installed-app checks found
  and ultimately resolved the lifecycle race conditions.

**What was hard or surprising**
- Native-to-JavaScript lifecycle interleavings produced many more race
  conditions than expected and required several review-and-fix rounds.
- Codex consumed a substantial token budget even when using GPT-5.6 instead of
  GPT-6 Astra.

**What to change**
- Plan explicit event-ordering scenarios for asynchronous and native/runtime
  boundaries before implementation begins.
- Maintain an OpenAI model-and-reasoning-effort matrix alongside the Anthropic
  aliases, using smaller models and lower effort by default and escalating only
  when concrete evidence demands it.
