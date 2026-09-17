---
bookmarks: []
---

# CheL-15: Clarify: checking items on the checklist template vs. within a run

## Notes

## Debrief summary

### 2026-09-17

**What went well**
- Quickly identified the concrete pieces to remove (`Item.checked`, `toggleItem`,
  `clearCheckedItems`, "Clear checked" UI) once the decision was made, and removed
  them cleanly across all layers in one pass.

**What was hard or surprising**
- The user was surprised template-level checking existed at all, and asked when it
  was introduced. Traced it to `99c50c6` ("Fill in product spec and architecture
  docs", 2026-09-16) — the checking/strikethrough/"Clear checked" behaviour was
  written into `docs/PRODUCT_SPEC.md` Feature 2 in the same commit that introduced
  Feature 4 (runs), so the overlap between template-checking and run-checking was
  baked into the spec from day one rather than added later without review. Ticket
  #2 and PR #7 then implemented exactly what the spec said, with no separate
  approval checkpoint that would have surfaced the overlap.

**What to change**
- Nothing — resolution (remove template-level checking entirely) was decided and
  shipped in one session with no friction.
