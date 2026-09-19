// CheL-36: Externally started checklist runs — scenario stubs (Scenario-WU).
// TODO: import the coordinator and its test harness when WU2 lands.
// TODO: replace every scenario comment with observable driver calls and
// assertions in the owning WU.

describe('ExternalRunLinkCoordinator', () => {
  it('starts an external run from a cold-start link after data is ready', () => {
    // TODO: Seed a non-empty checklist with a known ID.
    // TODO: Supply a valid initial external-run URL.
    // TODO: Keep checklist loading unresolved and verify no run starts early.
    // TODO: Resolve checklist loading and navigation readiness.
    // TODO: Verify a fresh run opens for the requested checklist.
    // TODO: Verify the external-run warning is shown.
  });

  it('replaces active runs for the same or another checklist without notifying the displaced caller', () => {
    // TODO: Start an external run and check one item.
    // TODO: Send another valid link for the same checklist.
    // TODO: Verify a fresh unchecked run replaces it without confirmation or callback.
    // TODO: Send a valid link for a different checklist.
    // TODO: Verify a fresh run for that checklist replaces the current run.
    // TODO: Verify neither displaced callback URL was opened.
  });

  it('returns one error status when a valid request cannot start', () => {
    // TODO: Send a valid request for a nonexistent checklist.
    // TODO: Verify the callback receives status=error and checklistId without runId.
    // TODO: Repeat with an empty checklist and verify the same public result.
    // TODO: Verify neither request starts a run.
  });

  it('rejects an invalid callback without disturbing an existing run', () => {
    // TODO: Start a normal run and check one item.
    // TODO: Send an external request with an invalid callback URL.
    // TODO: Verify the invalid-callback dialog is shown.
    // TODO: Dismiss the dialog.
    // TODO: Verify the original active run and checked progress remain intact.
  });
});
