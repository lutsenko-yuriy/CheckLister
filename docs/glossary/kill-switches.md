# Glossary: Kill-switches

Part of the project glossary; the index and the aliases table are in [`docs/GLOSSARY.md`](../GLOSSARY.md).

| Term | Definition | Code symbol |
|---|---|---|
| Kill-switch | A named on/off value, read from remote config and cached locally, that lets the owner disable a feature without a release; on by default when the feature ships | — |
| Minimum app version | The first app version whose code checks a given kill-switch; older builds ignore the switch's remote value | — |
| Debug screen | A screen available only in debug builds where a dev can override kill-switch values; overrides persist across restarts until reset | — |
