---
bookmarks: []
---

# CheL-158: Demo mode: clickable links and QR codes in the session

## Notes

- 2026-11-05: Hook spike (Checklist-WU). A `SessionStart` hook row with matcher `startup|resume|clear|compact` fired once per source: `clear`, `compact`, `startup` and `resume` each logged one run. The user confirmed the `systemMessage` shows for all four, and the `additionalContext` reached the model in the `compact` and `resume` sessions. Matcher and the JSON output shape in the plan work as designed.
- 2026-11-05: QR spike (Checklist-WU). A `qrencode -t UTF8 -m 2 -l M` block (37×18 characters, encoding a PR URL) printed in macOS Terminal.app scanned with the iPhone camera and opened the URL. The user reported it works, with no caveats on polarity, size or row gaps. `demo.py qr` can use these flags as planned, without an inverse flag.
- 2026-11-05: Checklist-WU, final run. With `demo.py render`, the bare issue, issue-comment and PR URLs opened the right pages in Terminal.app, but the modifier was Option-click, not ⌘-click as the plan assumed. All three QR codes scanned with a phone and opened the same URL. Docs say "click" without naming the modifier.

## Debrief summary

### 2026-11-05

**What went well**
- The ticket went smoothly. The plan, the two WUs and the spikes held up, and the spikes were pleasant to test.
- The result is good enough to show colleagues how YAB works in real use.

**What was hard or surprising**
- Nothing major. Two small surprises: links opened with Option-click, not ⌘-click as the plan assumed, and the first recording was made in a 371×96 terminal, so its text was too small to read.

**What to change**
- When confirming a checklist, name the items: the user's "all the spikes work" was meant to exclude the QR spike, and the agent read it as including it. Added to `docs/workflows/MULTI_WU.md` (Checklist-WU).
- For demo recordings, set the grid size before recording (about 120×35 for a video call), e.g. `asciinema rec --window-size 120x35`. This stays out of the agent rules because the user starts recording before Claude.
