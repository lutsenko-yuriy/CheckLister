# Product Specification

<!-- Describe what your product does from the user's perspective.
     The Product Owner agent reads this file to understand intended behaviour.
     Be specific about user-facing features, screens, and flows. -->

## Overview

CheckLister — A personal checklist app for iOS and Android. A single user
creates and manages their own checklists (e.g. groceries, packing, daily
routines) on one device. There are no accounts and no login: all data lives
locally on the device. There is no sharing or collaboration in v1 — every
checklist belongs to the person using the device.

## Features

### Feature 1 — Checklists
- The user must be able to create a new checklist by giving it a title.
- The user must be able to see a home screen listing all of their checklists.
- The user must be able to open a checklist to view and manage its items.
- The user must be able to rename an existing checklist.
- The user must be able to delete a checklist. Deleting a checklist deletes
  all of its items and cannot be undone; the user must confirm before it
  happens.
- The user can optionally see, at a glance on the home screen, how many
  items are in each checklist (e.g. "7 items").

### Feature 2 — Checklist items
- The user must be able to add an item to a checklist by typing its text.
- The user must be able to edit the text of an existing item.
- The user must be able to delete an item.
- A checklist is a reusable template: it has no checked/unchecked state of
  its own. Checking items off only ever happens within a run (Feature 4) —
  see Feature 4 for why.

### Feature 3 — Reordering
- The user must be able to reorder items within a checklist by dragging them
  into a new position.

### Feature 4 — Checklist runs
- From a checklist, the user must be able to start a new run: this creates a
  fresh, independent snapshot of the checklist's current items, all
  unchecked. Checking items off in a run never affects the source
  checklist's own items (Feature 2) — a run is its own copy.
- On the run screen, the user must be able to check and uncheck items,
  exactly as in Feature 2, but scoped to that run only.
- The run screen has a "Complete the checklist" button. It is only enabled
  once every item in the run is checked off.
- Leaving the run screen before completion (back button or gesture) prompts
  an "Are you sure?" confirmation. Confirming discards the run entirely and
  returns to the checklist; cancelling keeps the user on the run screen with
  their progress intact. There is no paused or resumable in-progress state —
  a discarded run cannot be recovered, and a run is otherwise either being
  actively worked on or it is completed.

### Feature 5 — Checklist run history
- From the home screen, the user can open a newest-first history of completed
  runs across all checklists. This entry point is shown only when at least one
  completed run exists.
- From a checklist screen, the user can open a newest-first history filtered to
  that checklist. This entry point is shown only when that checklist has at
  least one completed run.
- Each history entry shows the checklist name and a secondary line in the form
  "X items • Run on <date>". The item count, checklist name, and completion
  date are immutable snapshots from that exact run.
- Completed-run history remains available after its source checklist is changed
  or deleted.
- Only runs finished by pressing "Complete the checklist" are saved. Partial,
  abandoned, and discarded runs never appear.

### Feature 6 — Externally started runs
- Another mobile app can start a fresh run for a known checklist ID through a
  `checklister://run` link and provide a callback URL for the result.
- A valid external request replaces any active run without returning a result
  for the displaced run.
- Completing or confirming cancellation of an external run returns the public
  status, checklist ID, and—only after successful completion—the saved run ID.
- A missing or unrunnable checklist returns one public error status without
  exposing the internal reason.
- Invalid callback URLs and failed callback delivery show an explanation in
  CheckLister. A delivery failure does not undo a completed or cancelled run.
- Callback details remain in memory only and are never persisted or included
  in analytics.

## Out of scope for v1

- User accounts, login, or any backend — all data is local to the device.
- Cross-device sync — a checklist created on one device does not appear on
  another.
- Sharing or collaborating on a checklist with another person.
- Reminders or notifications for checklists or items.
- Pausing a checklist run and resuming it later.
- Editing or deleting entries from the checklist run history.
- Viewing item-level detail (which specific items were checked, and when)
  within a past run — history only records the checklist and completion
  time.
