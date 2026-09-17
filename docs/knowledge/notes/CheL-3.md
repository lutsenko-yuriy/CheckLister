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

### 2026-09-17

**What went well**
- The multi-WU split was correctly identified up front and held up in practice: WU1/WU2 (domain + state) needed zero changes when WU4's UI work later hit dependency trouble, confirming the plan's "drag-library-agnostic domain layer" risk mitigation actually worked.
- The ticket shipped and the app works end-to-end, including the drag-to-reorder and sectioning behavior.

**What was hard or surprising**
- The overall visual design doesn't look polished. This reads as a general React Native theming/design-system gap that should be addressed once, early in a project's life, rather than discovered piecemeal per-ticket — tracked as CheL-14.

**What slowed things down**
- Dependency compatibility churn: `react-native-draggable-flatlist` → attempted `react-native-reanimated@3.19.5` downgrade (which then hit two further native-level incompatibilities on this RN version) → settled on `react-native-reanimated-dnd`. Considered a one-off for this specific dependency stack rather than a process gap — no workflow change proposed — but recorded here in case a similar bleeding-edge-RN-version + third-party-native-lib mismatch recurs on a future ticket.

**What to change**
- Nothing process-level for this ticket. The design/theming gap is being addressed via a dedicated ticket (CheL-14) rather than a workflow change.
