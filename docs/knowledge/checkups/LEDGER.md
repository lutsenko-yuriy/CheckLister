# Checkup ledger

Tracks due status and open findings for the two-tier periodic code-quality checkup defined in [ADR-0001](../decisions/ADR-0001-two-tier-periodic-code-quality-checkup.md). `scripts/checkup/due.py` reads the **Cadence & due status** table below to report which tier(s) are due; the `/checkup` skill updates this file after each run.

## Cadence & due status

Each tier is tracked as "not yet done this period" — a period label, not an exact-day match — so it stays flagged as overdue until actually run (see ADR-0001). `Period covered` is the period label (`YYYY-MM` for light, `YYYY-Qn` for heavy) of the most recently completed run.

| Tier | Cadence | Last run | Period covered | Next due |
|---|---|---|---|---|
| Light | 1st of every calendar month | 2026-09-20 | 2026-09 | 2026-10 |
| Heavy | 14th of Jan/Apr/Jul/Oct | 2026-09-20 | 2026-Q3 | 2026-Q4 |

## Open findings

Findings needing human decision or larger effort, each carrying an explicit deadline — no individual PM ticket is filed (per ADR-0001). Classified using [Fowler's Technical Debt Quadrant](https://martinfowler.com/bliki/TechnicalDebtQuadrant.html) before being written up.

| ID | Opened | Tier | Dimension | Debt quadrant | Summary | Deadline | Write-up |
|---|---|---|---|---|---|---|---|
| CHK-2026-09-20-heavy-1 | 2026-09-20 | heavy | Accessibility | prudent-inadvertent | `colors.primary` as `RunScreen` "Back" button text measures 4.02:1, under WCAG AA 4.5:1 for normal text; needs a design decision (dedicated link-text color vs. darker primary) rather than a blind palette change | 2026-10-31 | [CHK-2026-09-20-heavy](CHK-2026-09-20-heavy.md) |
| CHK-2026-09-20-heavy-2 | 2026-09-20 | heavy | Accessibility | prudent-inadvertent | `IconButton`'s ~38×38pt effective touch target (22px icon + 8pt hitSlop) is below the 44×44pt/48×48dp guidance, affecting every icon-only action across the app | 2026-11-15 | [CHK-2026-09-20-heavy](CHK-2026-09-20-heavy.md) |

## Resolved findings

Archive of findings once fixed or otherwise closed out.

| ID | Opened | Resolved | Tier | Dimension | Summary | Write-up |
|---|---|---|---|---|---|---|
| _none yet_ | | | | | | |
