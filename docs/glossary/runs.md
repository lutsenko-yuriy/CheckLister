# Glossary: Runs

Part of the project glossary; the index and the aliases table are in [`docs/GLOSSARY.md`](../GLOSSARY.md).

| Term | Definition | Code symbol |
|---|---|---|
| Run | A snapshot copy of a checklist's items, created when the user starts working through it. Checking items off happens on this copy — never on the source checklist | `ChecklistRun` |
| Run item | An item's copy within a run, carrying the checked/unchecked state the template item lacks | `RunItem` |
| Run history entry | An immutable summary of one completed run, preserving its checklist identifier and title, item count, and completion time independently of later checklist changes or deletion | `RunHistoryEntry` |
