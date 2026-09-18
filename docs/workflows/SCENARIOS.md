# Verification scenarios for every ticket

Every ticket defines verification scenarios before implementation, including bugs,
infrastructure, documentation, research, and trivial changes. Record them in the
ticket or plan under **Verification scenarios**. Reuse existing coverage by linking
the exact test and explaining which acceptance criterion it verifies; do not use a
blanket “not applicable” to skip this step.

For each scenario record:

- A stable ticket-scoped name, e.g. `CheL-28-S1`.
- Preconditions and test data.
- Ordered actions and expected observable results (Given/When/Then is fine).
- The execution method and test file, or a concrete manual/evidence check with
  an owner and a reason automation is unsuitable.

Keep coverage proportional to the ticket: the happy path and relevant failures,
cancellation, persistence and platform behavior. A copy-only change may need one
rendered-text check; it does not need new test infrastructure.

## Choose the verification layer

- **App interactions:** add or update executable Maestro flows for affected
  user journeys, alongside Jest tests for component/domain behavior. A mocked
  navigator or a TODO stub alone does not verify a real navigation/gesture flow.
  Use `.maestro/` and [SCENARIOS.md](../SCENARIOS.md). State the target platform;
  an iOS pass is not evidence for Android. Until Android tooling lands in CheL-31,
  record Android coverage as a named manual scenario or an explicit follow-up,
  not as an automated pass.
- **Logic, scripts and infrastructure:** executable unit/integration or command
  scenarios with expected outputs, state changes and failure exit codes. Do not
  invent a UI flow for a command-line change.
- **Documentation, process and research:** concrete examples, link/consistency
  checks, or evidence-based acceptance scenarios. Explain the expected result
  so completion can be checked; automation is optional where it adds no value.

Use `draft-scenarios` to prepare these before coding. Existing user approval of
specific scenarios carries forward; do not ask for the same approval again.
Exploratory diagnosis can precede drafting, but a bug's reproducer/regression
scenario must be recorded before changing behavior.

## Implement and verify

Map each acceptance criterion to a scenario. Write executable assertions before
changing behavior and demonstrate the relevant failure where applicable; then
make them pass. New tests of already-working behavior may pass immediately—do
not break production code to manufacture a red result. Mark unfinished scenario
stubs explicitly pending/skipped; empty test bodies are not passing coverage.

Before requesting review, execute every applicable automated scenario on the
current code and record commands, results, platform/tool versions and artifact
locations in the PR or ticket. Include manual-check results, or clearly name the
remaining owner/blocker; never mark an unexecuted scenario as passed. Research-only
tickets record evidence before closure instead of opening a code PR.

Review/audit checks the scenario-to-acceptance-criterion mapping and execution
evidence. New behavior introduced during review needs corresponding scenarios.
A deferred scenario needs a linked follow-up ticket and an explicit scope decision;
do not silently drop a failing scenario required by the current ticket. The
existing human PR approval and shipping gates still apply.
