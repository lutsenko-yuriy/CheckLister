# Demo mode

Demo mode is a session setting for showing work to people: links are clickable in the terminal and the first one per work unit gets a QR code. It affects only how the agent presents text, never the app or the repo.

- Switch: `python3 scripts/demo/demo.py on | off | status` (state lives in the git common dir, shared by all worktrees). `on` needs Python 3.11+ to read `skill_router.toml`; use `python3.12` if `python3` is older. It warns when `qrencode` is missing and still turns on.
- The `SessionStart` hook runs `demo.py session-start` and re-announces demo mode after a restart, resume, clear or compaction while it is on.

## Rules while demo mode is on

1. **Render every link you mention** that is an issue, issue comment or PR URL: run `python3 scripts/demo/demo.py render <url> [<url>...]` and paste its output verbatim. Do this each time, not only the first; `render` decides whether a QR code is due.
1a. **Paste it in the reply text.** A tool result is not shown to the user, so the QR block must appear in the message itself, right after the link is created or mentioned. Never pipe `render` through `head` or truncate it, and never say it was shown earlier (CheL-161: missed at #163 and #166).
2. **Print the full URL, bare, on its own line.** Never shorten it to `#159`, hide it behind `[text](url)`, or put it in a code span. Only the QR block is fenced. Bare IDs in prose (`CheL-158`, `#159`) stay as they are.
3. **Comments you post:** report the comment's own permalink (the URL `gh issue comment` returns), not the issue link.
4. **First mention per WU:** `render` adds a QR code under a counted link once per work unit (key taken from the branch) and prints the URL alone afterwards. Pass `--wu KEY` to override the key.
5. **Without `qrencode`,** `render` prints the bare URL only. Do not add a hint line.
6. **Subagents do not render.** They return plain URLs; the main session renders them when it relays them. The hook reminder reaches only the main session.
7. **Off means off:** when demo mode is off, do not call `render`; print links as usual.
