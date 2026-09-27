# ADR-0004 — speed up the Maestro scenario suite via built-in device sharding rather than switching frameworks or restructuring flow fixtures

## Status
`accepted`

## Context
#102 researched why the local Maestro scenario suite is slow (iOS: 9m33s/13 flows measured this session; Android: ~43% slower than iOS for the same flow set) and what to do about it. Candidate directions in scope: reduce the drag-reorder swipe's deliberately-slow duration (#98 needed it slow to avoid a gesture-activation race), trim any fixed waits, switch to a different framework (Detox/Appium), restructure flows around a shared "robot"/fixture layer instead of each flow cold-launching and recreating its own checklist, use Maestro's built-in device sharding, and try `setClipboard`+`pasteText` in place of `inputText`.

Each candidate was evaluated empirically or against `docs/SCENARIOS.md`'s existing conventions (`docs/CONSTRAINTS.md`, referenced by `docs/workflows/RESEARCH.md`, does not exist in this repo — flagged separately, not blocking this decision):

- **Sharding** (`maestro test --shard-split=<N>`, official CLI flag): measured 45% wall-time reduction (573s → 312s) splitting the iOS suite across 2 already-available local simulators, zero flow-file changes ([Maestro CLI docs](https://docs.maestro.dev/maestro-cli/maestro-cli-commands-and-options) confirm the flag; docs example matches the shape of what was measured here).
- **Framework switch to Detox**: architecturally real (gray-box app-state awareness vs. Maestro's UI-hierarchy polling — [Detox: How Detox Works](https://wix.github.io/Detox/docs/articles/how-detox-works/)), but every public speed-comparison number found, including on Maestro's own site, traced to unsourced marketing content with no methodology; the one plausible independent migration case study (Jupiter engineering blog) could not be fetched to verify. Certain cost (native integration + Jest runner + rewriting ~14 existing flows) against zero trustworthy speed evidence.
- **`setClipboard`+`pasteText`** instead of `inputText`: measured no difference (40.65s vs 41.18s for 5 type-and-erase cycles) — our strings are short enough that simulated typing was never the bottleneck.
- **Shared-fixture ("robot") architecture**: would target the same repeated cold-launch overhead sharding already addresses more cheaply, and directly conflicts with `docs/SCENARIOS.md`'s deliberate per-flow isolation convention (the same principle #34/#97's snapshot mechanism protects at the app-data layer) — reintroduces cross-flow interference risk for a smaller win than sharding already provides.
- **Swipe-duration reduction**: real headroom exists (5/5 clean runs at 10000ms vs. the committed 12000ms), but this is a narrow, single-flow tuning question, not a suite-wide architecture decision — tracked as a candidate follow-up, not part of this ADR.
- **Fixed-wait audit**: no fixed sleeps/waits exist anywhere in the flow files — nothing to trim.

## Decision
Adopt Maestro's built-in `--shard-split=<N>` as the primary lever for scenario-suite wall time, using already-available local simulators/emulators. Do not migrate to Detox, Appium, or any other framework. Do not build a shared-fixture/"robot" flow architecture. The narrower swipe-duration-reduction finding may be pursued separately as small, low-risk follow-up implementation work; it does not change this decision.

Revisit if: Maestro's sharding proves unreliable in practice at scale, a trustworthy independent benchmark surfaces showing a large, real Detox/Appium speed advantage, or the suite's flow count grows enough that per-flow cold-launch overhead becomes the dominant cost even after sharding.

## Alternatives considered
| Option | Why not chosen |
|---|---|
| Migrate to Detox | Real architectural rationale (gray-box sync) but zero trustworthy speed evidence found (all public numbers, including Maestro's own, are unsourced marketing) against a certain, large rewrite cost |
| Migrate to Appium | No independent benchmark found at all comparing it to Maestro/Detox; directionally expected to be slower (WebDriver/JSON-wire-protocol overhead) but unverified |
| `setClipboard`+`pasteText` for typing | Measured no speed difference — our strings are too short for keystroke-simulation cost to matter |
| Shared-fixture ("robot") flow architecture | Targets the same overhead sharding already addresses more cheaply; conflicts with the project's deliberate per-flow isolation convention, risking a return of the flakiness class #34/#97/#98 fixed |

## Related ticket
#102

## Date
2026-09-27
