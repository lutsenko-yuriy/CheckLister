# CheL-29: Smoke tests: drag-to-reorder on iOS

## Notes

## Debrief summary

### 2026-09-22

**What went well**
- Another self-directed ticket end to end: scoped, implemented the testID, wrote and iterated the Maestro flow, verified twice on a real simulator, all without back-and-forth. The user's only involvement was reviewing the finished PR.

**What was hard or surprising**
- Maestro's `swipe` command silently fails to parse several plausible element-selector schemas for `start`/`end` (`id`, `point`, `from`/`to`) — only plain point/percentage coordinates work. Had to probe several variants directly against the CLI to find the working syntax.
- `react-native-reanimated-dnd`'s pan gesture (`activateAfterLongPress(200)`) never activates from a fast synthetic swipe — a 1.5s duration produced zero movement. A 4s duration reliably triggers and completes the drag. Both findings are now documented in `docs/SCENARIOS.md` so the next scenario ticket doesn't rediscover them from scratch.

**What to change**
- Nothing flagged — the mitigation for this ticket's friction is the documentation itself, not a workflow change.
