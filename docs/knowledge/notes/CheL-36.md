# CheL-36: Externally started checklist runs with callback results

## Notes

- 2026-09-19: Several race-condition bugs were found during implementation, particularly around asynchronous run completion, replacement, persistence, and callback delivery. For future features with overlapping asynchronous state transitions, explicitly model and test race scenarios during planning and implementation rather than relying on the review round to uncover them.

## Debrief summary
