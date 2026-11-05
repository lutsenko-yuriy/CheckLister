# Demo Mode

Demo mode is a session setting for showing work to people: links become clickable in the terminal. It affects only how the agent presents text, never the app or the repo.

- Switch: `python3 scripts/demo/demo.py on | off | status` (state lives in the git common dir, shared by all worktrees).
- The `SessionStart` hook runs `demo.py session-start` and re-announces demo mode after a restart, resume, clear or compaction while it is on.

Link rendering and QR codes are specified in a later work unit of CheL-158 and are not active yet.
