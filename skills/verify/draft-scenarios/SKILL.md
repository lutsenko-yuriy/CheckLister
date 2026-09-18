---
name: draft-scenarios
effort: FOCUSED
reasoning: TACTICAL
context: pm
output_style: CONCISE
description: Define verification scenarios for every ticket before implementation, including app flows, bugs, infrastructure, docs and research. Map acceptance criteria to Maestro/Jest/command tests or concrete evidence checks; reuse existing coverage where applicable.
---

@skills/shared/project-config.md

Read `docs/workflows/SCENARIOS.md`. This skill defines verification targets, not
production code. A scenario is a sequence of actions and observable expected
results; it is not necessarily a mocked component test or a UI test.

## 1. Read the ticket and coverage

Fetch the ticket and plan comments. Read acceptance criteria and the relevant
existing tests, flows and helpers. Identify coverage to reuse and gaps to fill.
For a bug, use the observed reproducer as the starting scenario.

## 2. Draft the minimum complete scenario set

Record **Verification scenarios** in the ticket or plan. For each scenario give:

1. Ticket-scoped ID and descriptive name.
2. Acceptance criterion and preconditions/test data.
3. Ordered actions and expected observable results.
4. Execution method, test file and target platform; for a manual/evidence check,
   name its owner and why automation is unsuitable.

Cover the primary path and relevant failures, cancellation, persistence and
navigation. Do not add unrelated coverage or duplicate existing tests. Link exact
existing scenarios when they already cover a criterion.

Choose the appropriate layer:

- App journeys: `.maestro/` flows with reusable helpers and isolated fixtures;
  supplement with colocated Jest tests for component/domain logic.
- Scripts/infrastructure/logic: executable command, unit or integration tests.
- Docs/process/research/trivial changes: proportionate, concrete verification
  examples or evidence checks; do not create artificial UI automation.

No ticket skips scenario definition solely because it has no UI. State platform
coverage honestly; an iOS flow does not verify Android.

## 3. Present and approve

Present the scenarios with their steps and assertions. Wait for approval before
writing executable drafts unless the user has already approved these scenarios.
Carry existing approval forward; do not ask for the same approval twice.

## 4. Write approved drafts

Use the chosen harness and existing conventions. Where executable assertions can
be written now, write them before implementation and run the relevant test. If a
multi-WU scenario needs a stub first, explicitly mark it pending/skipped and keep
its reviewed steps as comments; never let an empty test appear as passing coverage.
Keep still-shipping legacy scenarios until the work unit that retires the behavior.

For Maestro, put runnable scenarios at `.maestro/` and helpers below `helpers/`.
Keep unfinished drafts outside top-level discovery (for example in
`.maestro/drafts/`) until implemented. Do not commit a placeholder as an executed
smoke test. Evidence/manual scenarios stay in the ticket/plan checklist.

## 5. Hand off

List scenario IDs, linked existing tests, new files/checklists, and pending work.
`implement` completes executable assertions and records real execution evidence
before review. For already-working behavior, passing new tests are valid; do not
alter production behavior just to force a red test.
