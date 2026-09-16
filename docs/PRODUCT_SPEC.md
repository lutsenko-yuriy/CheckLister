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
  items in each checklist are still unchecked (e.g. "3 of 7 left").

### Feature 2 — Checklist items
- The user must be able to add an item to a checklist by typing its text.
- The user must be able to check an item off (mark complete) and uncheck it
  again by tapping it.
- The user must be able to edit the text of an existing item.
- The user must be able to delete an item.
- Checked items must remain visible in the checklist (shown with a
  strikethrough / checked style) rather than disappearing, so the user can
  review or uncheck them.
- The user can optionally clear all checked items from a checklist in one
  action, once they're done with it (e.g. after a shopping trip).

### Feature 3 — Reordering & sections
- The user must be able to reorder items within a checklist by dragging them
  into a new position.
- The user can optionally group items into named sections within a single
  checklist (e.g. "Produce" / "Dairy" within a Groceries checklist), and
  reorder sections the same way as items.
- Items added without picking a section go into a default, unnamed section
  at the top of the checklist.

### Feature 4 — Checklist runs
- From a checklist, the user must be able to start a new run: this creates a
  fresh, independent snapshot of the checklist's current items, all
  unchecked. Checking items off in a run never affects the source
  checklist's own items (Feature 2) — a run is its own copy.
- On the run screen, the user must be able to check and uncheck items,
  exactly as in Feature 2, but scoped to that run only.
- The run screen has a "Complete the checklist" button. It is only enabled
  once every item in the run is checked off.
- A run cannot be left unfinished: the only way off the run screen is
  pressing "Complete the checklist" once all items are checked. There is no
  paused or resumable in-progress state — a run is either being actively
  worked on or it is completed.

### Feature 5 — Checklist run history
- The user must be able to view a history of all completed checklist runs,
  across all checklists.
- Each history entry must show which checklist the run was for and when it
  was completed.
- Because a run only ever gets saved to history by pressing "Complete the
  checklist," every history entry represents a fully checked-off run — there
  are no partial or abandoned runs in history.

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
