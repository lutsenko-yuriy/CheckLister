# CheL-124: `build/` gitignore rule hides skills/build/implement

## Notes

## Debrief summary

### 2026-11-05

**What went well**
- Smooth. A one-line `!/skills/build/` negation fixed the ignore rule, and `git check-ignore` confirmed that `ios/build`, `android/build` and `android/app/build` stay ignored.
- The review round caught real problems in the `implement` skill that nobody had seen because the file was never tracked: `N/A-XX` placeholders, an invalid `gh issue comment list` command, a stale commit trailer and a missing `git-cli-safety` include. They were fixed in the same PR.

**What was hard or surprising**
- Nothing notable. The stale `enabledMcpjsonServers` entry in the untracked local `.claude/settings.local.json` could not be edited by the agent (blocked by the auto-mode classifier), so it stays a manual cleanup.

**What to change**
- No workflow or skill changes.
