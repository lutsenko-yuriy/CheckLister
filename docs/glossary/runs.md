# Glossary: Runs

Part of the project glossary; the index and the aliases table are in [`docs/GLOSSARY.md`](../GLOSSARY.md).

| Term | Definition | Code symbol |
|---|---|---|
| Attachment | A photo the user adds to a run item or to a run, taken with the camera or chosen from the photo library. Photos only for now; view only once the run is completed | — |
| Item attachment | The single attachment a run item can hold | — |
| Run | A snapshot copy of a checklist's items, created when the user starts working through it. Checking items off happens on this copy — never on the source checklist | `ChecklistRun` |
| Run attachment | An attachment held by the run as a whole rather than by one item; a run can hold several | — |
| Run item | An item's copy within a run, carrying the checked/unchecked state the template item lacks | `RunItem` |
| Run history entry | An immutable summary of one completed run, preserving its checklist identifier and title, item count, and completion time independently of later checklist changes or deletion | `RunHistoryEntry` |
