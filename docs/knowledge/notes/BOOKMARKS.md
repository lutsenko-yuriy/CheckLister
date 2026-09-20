# Bookmarks

Hand-authored vocabulary of bookmarks used across `docs/knowledge/notes/`. Each note's
`bookmarks:` frontmatter must use only names from this table (lowercase kebab-case). Add
a new row when a genuinely new theme emerges from the corpus — don't invent a synonym for
something already covered here.

`scripts/notes/index.py --check` fails a note that uses a bookmark not listed below.

Starts empty on a fresh project. Add the first row the first time `/debrief` or `/note`
surfaces a recurring theme worth tagging; re-validated quarterly as part of the heavy
`/checkup` tier (dimension 9, "Knowledge-corpus bookmark health").

| Bookmark | Meaning |
|---|---|
| `async-lifecycle-races` | Race conditions from overlapping async/native state transitions (run completion, replacement, callback delivery) that only surfaced during implementation, not planning. |
| `real-device-only-bugs` | Bugs or platform quirks (accessibility-tree flattening, gesture/back-button behavior, native route wiring) that only surface via manual or scripted testing on a real device/simulator, never from unit tests alone. |
| `scenario-fixture-isolation` | Maestro/scenario test fixtures can't be fully cleaned up through the product UI alone, leaving residual data (e.g. persistent run history) after a suite run. |
| `agent-model-calibration` | Friction mapping effort/reasoning tiers to a non-Anthropic coding-agent model (e.g. Codex/OpenAI), leading to higher-than-expected token usage. |
