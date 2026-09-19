# Glossary

Canonical domain terms for this project. Skills and documentation use these names consistently.
When a new term is introduced during a `brief` session, add it here before creating the ticket.

<!-- Format: one table per domain area. Example:

## Core concepts

| Term | Definition | Code symbol |
|---|---|---|
| Pact | A user's commitment to show up for a habit N times | `Pact` |
| Showup | A single instance of fulfilling a pact | `Showup` |

## Known aliases to avoid

| Avoid | Use instead |
|---|---|
| session | showup |
| commitment | pact |

-->

## Core concepts

| Term | Definition | Code symbol |
|---|---|---|
| Callback URL | An app-specific URL supplied by another mobile app so CheckLister can return the outcome of an externally started run | — |
| Checklist | A named list of items the user creates and manages (e.g. "Groceries") | `Checklist` |
| Deep link | A URL that opens CheckLister at a specific action or destination, such as starting a run for a checklist | — |
| Externally started run | A fresh checklist run started by a deep link from another mobile app, with its outcome returned through a callback URL | — |
| Item | A single line entry within a checklist template. Has no checked/unchecked state itself — checking off happens on the item's copy within a run | `Item` |
| Run | A snapshot copy of a checklist's items, created when the user starts working through it. Checking items off happens on this copy — never on the source checklist | `ChecklistRun` |
| Run history entry | An immutable summary of one completed run, preserving its checklist identifier and title, item count, and completion time independently of later checklist changes or deletion | `RunHistoryEntry` |
