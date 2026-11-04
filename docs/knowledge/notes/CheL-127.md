# CheL-127: Add Settings screen with analytics toggle

## Notes

## Debrief summary

### 2026-11-04

**What went well**
- Delivered quickly in three WUs: scenarios first, then the Settings screen, then the history row.
- The user-approved test gates and test-first `setChoice` kept each WU small.
- The review loop caught the safe-area issue before merge; iOS (15/15) and Android scenario suites passed.

**What was hard or surprising**
- Bottom safe-area overlap was found only at audit, because the app uses no insets anywhere else.
- The Jest mock for `react-native-safe-area-context` was needed in two places (App test, then globally).
- One commit went in while tests were failing (the commit ran after the test step regardless of its result).

**What to change**
- Added a CODE_STYLE smell: bottom-pinned UI must add the bottom safe-area inset.
- Chain test, lint and commit so a failing test blocks the commit.
