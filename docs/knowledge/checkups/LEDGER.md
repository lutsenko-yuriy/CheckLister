# Checkup ledger

Tracks due status and open findings for the two-tier periodic code-quality checkup defined in [ADR-0001](../decisions/ADR-0001-two-tier-periodic-code-quality-checkup.md). `scripts/checkup/due.py` reads the **Cadence & due status** table below to report which tier(s) are due; the `/checkup` skill updates this file after each run.

## Cadence & due status

Each tier is tracked as "not yet done this period" — a period label, not an exact-day match — so it stays flagged as overdue until actually run (see ADR-0001). `Period covered` is the period label (`YYYY-MM` for light, `YYYY-Qn` for heavy) of the most recently completed run.

| Tier | Cadence | Last run | Period covered | Next due |
|---|---|---|---|---|
| Light | 1st of every calendar month | 2026-10-01 | 2026-10 | 2026-11 |
| Heavy | 14th of Jan/Apr/Jul/Oct | 2026-09-20 | 2026-Q3 | 2026-Q4 |

## Open findings

Findings needing human decision or larger effort, each carrying an explicit deadline — no individual PM ticket is filed (per ADR-0001). Classified using [Fowler's Technical Debt Quadrant](https://martinfowler.com/bliki/TechnicalDebtQuadrant.html) before being written up.

| ID | Opened | Tier | Dimension | Debt quadrant | Summary | Deadline | Write-up |
|---|---|---|---|---|---|---|---|
| CHK-2026-10-01-light-1 | 2026-10-01 | light | Scenario quality | prudent-deliberate | Valid-checklist external-run/-select completion and cancellation (CheL-36/CheL-40 happy paths) have only component-level coverage; promoting them to installed-app Maestro flows (now feasible via CheL-34's snapshot) is untracked | 2026-11-30 | [CHK-2026-10-01-light](CHK-2026-10-01-light.md) |

## Resolved findings

Archive of findings once fixed or otherwise closed out.

| ID | Opened | Resolved | Tier | Dimension | Summary | Write-up |
|---|---|---|---|---|---|---|
| CHK-2026-09-20-heavy-1 | 2026-09-20 | 2026-09-20 | heavy | Accessibility | `RunScreen` "Back" text under WCAG AA — fixed by CheL-45 (#47): dedicated `linkText` token (4.82:1 light; 9.26:1 dark, re-verified 2026-10-01) | [CHK-2026-09-20-heavy](CHK-2026-09-20-heavy.md) |
| CHK-2026-09-20-heavy-2 | 2026-09-20 | 2026-09-20 | heavy | Accessibility | `IconButton` touch target below 44×44pt — fixed by CheL-46 (#48): 44pt min width/height (re-verified 2026-10-01) | [CHK-2026-09-20-heavy](CHK-2026-09-20-heavy.md) |
