# CheL-28: Smoke tests: checklist item editing on iOS

## Notes

- 2026-09-21: While tapping an item row's Save/Cancel icon while its draft `TextInput` is still focused, the first tap only blurs the input (default RN tap-outside-dismisses-keyboard behavior); the actual save/cancel needs a second tap. Confirmed on the real iPhone 17 Pro / iOS 26.5 simulator, not a Maestro artifact. Out of scope for this test-only ticket; worth a follow-up considering `keyboardShouldPersistTaps="handled"` on the item list to fix the double-tap UX.

## Debrief summary

### 2026-09-21

**What went well**
- The whole ticket — flow, row-scoped testIDs, real-simulator verification (two consecutive 11/11 suite runs), the double-tap discovery, and its follow-up ticket — was handled end to end without back-and-forth; the user reviewed the finished result and was satisfied.

**What was hard or surprising**
- FEATURE.md's "the review loop starts automatically once the PR/MR is open" phrasing led me to *announce* that review had started without actually invoking the `review`/`audit` skills. The user caught it by asking "Did it start?" — `ListAgents` confirmed nothing had spawned.

**What to change**
- Reworded the "starts automatically" language in FEATURE.md steps 9 and 10 to an explicit imperative ("invoke the `review` and `audit` skills yourself right now") so a stated intention can't substitute for the actual tool call again.
