# Glossary: External links

Part of the project glossary; the index and the aliases table are in [`docs/GLOSSARY.md`](../GLOSSARY.md).

| Term | Definition | Code symbol |
|---|---|---|
| Deep link | A URL that opens CheckLister at a specific action or destination, such as starting a run or a checklist selection for another app | — |
| Callback URL | An app-specific URL supplied by another mobile app so CheckLister can return the outcome of an externally started run or checklist selection request | — |
| Checklist selection request | A request from another mobile app, via a deep link, asking the user to pick one of their checklists, with the choice (or a cancellation) returned through a callback URL | `ExternalSelectRequest` |
| Externally started run | A fresh checklist run started by a deep link from another mobile app, with its outcome returned through a callback URL | `ExternalRunRequest` |
