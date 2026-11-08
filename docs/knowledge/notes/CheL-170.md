---
bookmarks: []
---

# CheL-170: Fix Android persistence scenario selector and iOS export-compliance prompt

## Notes

## Debrief summary

### 2026-11-08

**What went well**
- The failing flow's log named the assertion, and the same assertion failing in a different flow on the WU3 `main` run showed it was a selector problem, not a one-off flake.
- Anchoring the tap to the `'(.+, )?Scenario second'` form the other flows already use fixed both the Android and iOS persistence flows with a two-line change.

**What was hard or surprising**
- WU3 (#165) added an "Add photo to Scenario second" button. That label matches the loose `.*Scenario second.*` selector, so Maestro sometimes tapped the button instead of the item. The result depended on element order, which is why the flow passed on some runs and failed on others.
- The README scenarios badge already existed (gist-backed, "14/15 passed"); it was briefly misreported as missing and a wording change to it was reverted at the user's request.

**What to change**
- When a work unit adds a control whose accessibility label contains item text, grep `.maestro/` for loose `.*<text>.*` selectors in the same PR (the existing flow-conventions test could enforce this).
- Debrief done with no dialog: the user said there was nothing special to capture. No workflow or skill files were changed.
