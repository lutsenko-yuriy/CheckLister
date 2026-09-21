# CheL-54: Checklist item edit Save/Cancel require a double tap

## Notes

## Debrief summary

### 2026-09-21

**What went well**
- End-to-end, self-directed ticket: the bug was discovered, root-caused (RN's `keyboardShouldPersistTaps` default swallowing the first tap on a scroll container), fixed via a `patch-package` patch to `react-native-reanimated-dnd`, and verified on a real simulator, all without back-and-forth. The user's only involvement was reviewing the finished PR and asking what the fix and patch file actually did.

**What was hard or surprising**
- Nothing flagged.

**What to change**
- Nothing flagged.
