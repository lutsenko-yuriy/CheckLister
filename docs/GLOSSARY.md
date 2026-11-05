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
| Analytics consent | The user's explicit opt-in (or refusal) to usage analytics collection, asked once through the analytics consent dialog; nothing is collected until the user allows it | — |
| Analytics consent dialog | The modal shown over the home screen to users who have not yet chosen, with equal-weight "Allow" and "Don't allow" buttons; it stays open until the user chooses | — |
| Callback URL | An app-specific URL supplied by another mobile app so CheckLister can return the outcome of an externally started run or checklist selection request | — |
| Checklist | A named list of items the user creates and manages (e.g. "Groceries") | `Checklist` |
| Checklist selection request | A request from another mobile app, via a deep link, asking the user to pick one of their checklists, with the choice (or a cancellation) returned through a callback URL | `ExternalSelectRequest` |
| Debug screen | A screen available only in debug builds where a dev can override kill-switch values; overrides persist across restarts until reset | — |
| Deep link | A URL that opens CheckLister at a specific action or destination, such as starting a run or a checklist selection for another app | — |
| Externally started run | A fresh checklist run started by a deep link from another mobile app, with its outcome returned through a callback URL | `ExternalRunRequest` |
| Item | A single line entry within a checklist template. Has no checked/unchecked state itself — checking off happens on the item's copy within a run | `Item` |
| Kill-switch | A named on/off value, read from remote config and cached locally, that lets the owner disable a feature without a release; on by default when the feature ships | — |
| Minimum app version | The first app version whose code checks a given kill-switch; older builds ignore the switch's remote value | — |
| Run | A snapshot copy of a checklist's items, created when the user starts working through it. Checking items off happens on this copy — never on the source checklist | `ChecklistRun` |
| Run item | An item's copy within a run, carrying the checked/unchecked state the template item lacks | `RunItem` |
| Run history entry | An immutable summary of one completed run, preserving its checklist identifier and title, item count, and completion time independently of later checklist changes or deletion | `RunHistoryEntry` |
| Scenario build | A Release build made only for the Maestro scenario suite, in which Firebase Remote Config and analytics are replaced by stubs the scenarios can control; never shipped to testers or users | — |
| Settings screen | The screen opened from the gear icon in the home header, where the user manages app-level preferences; for now it holds only the analytics consent switch | — |
