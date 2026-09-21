# CheL-28: Smoke tests: checklist item editing on iOS

## Notes

- 2026-09-21: While tapping an item row's Save/Cancel icon while its draft `TextInput` is still focused, the first tap only blurs the input (default RN tap-outside-dismisses-keyboard behavior); the actual save/cancel needs a second tap. Confirmed on the real iPhone 17 Pro / iOS 26.5 simulator, not a Maestro artifact. Out of scope for this test-only ticket; worth a follow-up considering `keyboardShouldPersistTaps="handled"` on the item list to fix the double-tap UX.

## Debrief summary
