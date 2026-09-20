---
bookmarks: [scenario-fixture-isolation]
---

# CheL-5: Checklist run history

## Notes

- 2026-09-18: Adding persistent, non-deletable run history means Maestro completion scenarios can no longer clean up every generated artifact through the product UI. The CheL-5 history scenario will use a unique fixture on the dedicated test simulator and leave one identifiable history entry; revisit test-data isolation and cleanup in the debrief, with the durable solution tracked in a separate GitHub issue.
- 2026-09-18: Add `CODE_STYLE.md` as part of initial project creation rather than introducing it after implementation has begun. Establishing TypeScript, React Native, formatting, and code-smell conventions early prevents avoidable convention drift and noisy cleanup later.

## Debrief summary

### 2026-09-18

**What went well**
- The ticket went well overall: the implementation remained readable, comprehensible, and understandable despite the eventual PR size.
- The missing code-style baseline was identified during review and corrected quickly.

**What was hard or surprising**
- The implementation plan described a long body of work without making the single-PR-versus-multiple-WUs decision explicit.
- CheL-5 was large enough to plausibly split into two or three WUs, but the completed PR was still coherent enough that size alone did not make it difficult to review.
- Introducing `CODE_STYLE.md` after implementation had started caused avoidable convention and Markdown-formatting cleanup.

**What to change**
- Make `CODE_STYLE.md` a project-bootstrap artifact created before the first feature implementation.
- Require plans to estimate changed lines by production, tests/scenarios, and documentation/configuration, plus the number of substantive files.
- Treat more than approximately 500 changed lines or more than 10 substantive files as a soft checkpoint for splitting work, targeting cohesive WUs of roughly 250–350 changed lines and 10 or fewer substantive files.
- Exclude generated files, lockfiles, and mechanical formatting-only files from the substantive-file estimate, and allow larger cohesive WUs when the plan states why splitting would reduce clarity.
