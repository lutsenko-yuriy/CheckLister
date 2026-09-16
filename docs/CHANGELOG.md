# Changelog

A record of all versioned releases. For planned work and known issues, see @docs/BACKLOG.md.

---

<!-- This file is maintained by the Product Owner agent.
     New sections are prepended after each merged PR in the format:

## [X.Y.Z] — YYYY-MM-DD (PR #N merged)

### Added / Changed / Fixed
- ...
-->

## [0.1.0] — 2026-09-17 (PR #6 merged)

### Added
- [user] You can now create, rename, and delete checklists from the home screen, with a running count of how many items are left to check off once a checklist has items.
- [app] Added the checklists feature's domain/data/state/ui layers (`Checklist`/`Item` models, an AsyncStorage-backed repository, and a `useChecklists` hook) and wired up React Navigation between the home screen and a checklist detail screen.
