---
bookmarks: []
---

# CheL-158: Demo mode: clickable links and QR codes in the session

## Notes

- 2026-11-05: Hook spike (Checklist-WU). A `SessionStart` hook row with matcher `startup|resume|clear|compact` fired once per source: `clear`, `compact`, `startup` and `resume` each logged one run. The user confirmed the `systemMessage` shows for all four, and the `additionalContext` reached the model in the `compact` and `resume` sessions. Matcher and the JSON output shape in the plan work as designed.
- 2026-11-05: QR spike (Checklist-WU). A `qrencode -t UTF8 -m 2 -l M` block (37×18 characters, encoding a PR URL) printed in macOS Terminal.app scanned with the iPhone camera and opened the URL. The user reported it works, with no caveats on polarity, size or row gaps. `demo.py qr` can use these flags as planned, without an inverse flag.
