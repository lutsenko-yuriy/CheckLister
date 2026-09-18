**Scenarios first.**

Follow `docs/workflows/SCENARIOS.md` and the ticket's selected test layers. Complete
pending Maestro/Jest/command drafts and reuse linked existing coverage. For new
behavior or fixes, demonstrate the relevant failing assertion before implementation.
Coverage-only tests of already-working behavior may pass immediately; never break
production code to manufacture red. Docs/research scenarios use concrete evidence
checks rather than artificial failing tests.

**Green — implement the minimum code to pass.**

- Write only what is needed. Follow `docs/ARCHITECTURE.md` for structure and `CLAUDE.md` for code style.
- Never import across feature or layer boundaries in ways that violate the architecture.

**Refactor — clean up without breaking tests.**

Remove duplication, improve naming, simplify logic. Re-run the test command after every step.

**Commit — after each red→green→refactor cycle.**

When one logical unit is complete (tests pass, refactor done), commit immediately before starting the next:

```bash
git commit -m "$(cat <<'EOF'
<type>: <what this logical unit does>

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

Types: `feat` (new behaviour), `fix` (bug-fix cycle), `refactor` (restructure-only), `test` (test-only change).

Repeat the full red→green→refactor→commit cycle for each logical unit. The PR accumulates one commit per cycle — reviewable commit-by-commit on the Git host.
