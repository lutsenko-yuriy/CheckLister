---
bookmarks: []
---

# CheL-158: Demo mode: clickable links and QR codes in the session

## Notes

- 2026-11-05: Hook spike (Checklist-WU). A `SessionStart` hook row with matcher `startup|resume|clear|compact` fired once per source: `clear`, `compact`, `startup` and `resume` each logged one run. The user confirmed the `systemMessage` shows for all four, and the `additionalContext` reached the model in the `compact` and `resume` sessions. Matcher and the JSON output shape in the plan work as designed.
