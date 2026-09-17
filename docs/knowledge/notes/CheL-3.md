# CheL-3: Reordering & sections

## Notes

- 2026-09-17: When setting up a project's ticket prefix (`skills/shared/pm-tool-mapping.md`), the setup process should explicitly ask the user for a prefix. If the user gives no answer, default to the initials derived from the project name (e.g. "CheckLister" / "check_lister" / "check lister" / "check-lister" -> "CL"), rather than leaving a placeholder like "N/A" unfilled.
- 2026-09-17: Consider adding a visual progress representation for multi-WU tickets, shown after every WU completes. Something like a vertical checklist/timeline: a collapsed "[v] X WUs done" summary line (hidden if none done yet) followed by one line per WU showing its number, short description, and status (e.g. "[v] WU<N>: <short description> - done"), connected top-to-bottom like a progress list, followed by the same per-WU line style for not-yet-started WUs (e.g. "[ ] WU<N>: <short description> - coming up") and a collapsed "[ ] X WUs remaining" summary line (optional) at the bottom. Would help make ticket progress legible at a glance across WU cycles. Full shape:
  ```
  [v] X WUs done          <- omitted if none done yet
  |
  [v] WU<N>: <desc> - done
  |
  [ ] WU<N>: <desc> - coming up
  |
  [ ] X WUs remaining     <- optional
  ```

- 2026-09-17: When a PR/MR is opened as part of the workflow (`FEATURE.md` step 9), automatically open it in the browser right after, instead of just reporting the URL in text. Saves a manual step of clicking/copying the link every time.

- 2026-09-17: There's no dedicated "run scenarios" skill, and none seems needed: scenarios in this project aren't a separate suite/harness, they're just Jest/RNTL stub tests colocated in the same `*.test.tsx` files as everything else (per `skills/shared/project-config.md`'s component-test harness). `npm test` runs them together with unit/integration tests automatically. Worth confirming this stays true if an e2e/Detox harness is ever added — at that point "run scenarios" might need to become its own step/skill.

## Debrief summary
