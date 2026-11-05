# Glossary

Canonical domain terms for this project. Skills and documentation use these names consistently.
Terms live in one file per domain under `docs/glossary/`; this file is the entry point and holds
the aliases table.

When a new term is introduced during a `brief` session, add it to the domain file it belongs to
(create a new `docs/glossary/<domain>.md` and link it below if no domain fits) before creating
the ticket. Every domain file uses the same table: `| Term | Definition | Code symbol |`.

## Domains

| File | Terms |
|---|---|
| [`checklists.md`](glossary/checklists.md) | Checklist, Item |
| [`runs.md`](glossary/runs.md) | Run, Run item, Run history entry |
| [`external-links.md`](glossary/external-links.md) | Deep link, Callback URL, Checklist selection request, Externally started run |
| [`analytics.md`](glossary/analytics.md) | Analytics consent, Analytics consent dialog |
| [`settings.md`](glossary/settings.md) | Settings screen |
| [`kill-switches.md`](glossary/kill-switches.md) | Kill-switch, Minimum app version, Debug screen |
| [`scenarios.md`](glossary/scenarios.md) | Scenario build |

## Known aliases to avoid

Words that name a defined term but must not be used for it. Keep this table here, not in the
domain files: an alias points across domains, and one table is the single place to check.

| Avoid | Use instead |
|---|---|
