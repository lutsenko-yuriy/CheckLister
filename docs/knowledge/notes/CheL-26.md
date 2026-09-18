---
bookmarks: []
---

# CheL-26: Scripted scenario automation for the iOS simulator

## Notes

### 2026-09-18

**Real simulator evidence matters.** Maestro revealed that iOS flattens checklist
rows in the accessibility tree. Parent-based cleanup selected the wrong Delete
button; the run was stopped with the confirmation still open and both original
checklists intact. A precise fixture selector and dialog-scoped confirmation
fixed cleanup. On iOS 26.5, an edge swipe opens confirmation while retaining the
run, despite older comments describing the gesture as disabled. The scenarios
verify observed behavior, cancellation, continued interaction and navigation.

**Verified delivery.** The three scenarios cover completion, Back/Cancel/Discard,
and native edge-swipe confirmation. Two consecutive runs passed, and the renamed
`npm run scenarios:ios` command passed all three again. There are 87 passing Jest
tests and six runner contract tests; lint passes. Future coverage is tracked in
CheL-28 through CheL-31.

## Debrief summary

### 2026-09-18

**What went well**
- The user considered the first YAB session in Codex successful, especially the
  product outcome. Scripted simulator scenarios now replace manual walkthroughs
  for the covered journeys.
- Independent review identified a contradictory implementation rule in the
  proposed policy, which was corrected before that proposal was separated.

**What was hard or surprising**
- Token usage was high. The user attributed much of that to a less established
  effort-to-OpenAI-model mapping than the existing Anthropic mapping.
- Starting a separate agent in Codex was unclear to the user. Model calibration
  and agent-start guidance remain follow-up topics, not solved by this ticket.
- The assistant expanded the scenario request across too many workflow, skill
  and documentation files inside the tooling PR. The user wanted a narrower scope.
- “Smoke tests” understated the intended behavior assertions. The agreed term is
  **scenarios**, including commands, documentation and the PR description.

**What to change**
- Keep broader meta-harness changes separately scoped. The every-ticket scenario
  policy was extracted into CheL-32 / draft PR #33 for independent review, including
  consideration of a smaller change to the existing draft-scenarios skill.
- Keep PR #27 focused on the local iOS scenario tooling and directly related setup
  documentation. Use “scenarios” consistently for this suite.
- Retain the model-mapping and agent-start friction as debrief observations; no
  additional harness changes were requested or applied to address them here.
