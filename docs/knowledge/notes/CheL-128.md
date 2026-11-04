---
bookmarks: []
---

# CheL-128: Add remote kill-switches (first: Run history)

## Notes

## Debrief summary

### 2026-11-03

**What went well**
- The brief reached a clear ticket, and the version rule was restated and confirmed before it went into the ticket.

**What was hard or surprising**
- "Above" and "below" for app versions had two opposite readings (numerically larger vs. listed higher up).

**What to change**
- Use "newer" and "older" for versions, and restate ambiguous ordering terms before relying on them. Added to `skills/shared/dialog-principles.md`; similar work for other dimensions and values may follow later.

### 2026-11-04

**What went well**
- The WU0/WU1/WU2 split with tests first kept each PR reviewable.
- A real Remote Config fetch worked with analytics collection off, which confirmed the design assumption.
- Fail-open held when the console parameter had the wrong type.
- The Release-bundle grep showed the debug code is stripped from Release.

**What was hard or surprising**
- The modular Remote Config API has no `setDefaults` or `setConfigSettings`.
- Unsigned simulator builds can't fetch Remote Config (keychain error -34018); ad-hoc signing fixes it.
- The Debug build failed once at the `ReactCodegen` link step and later built fine; the cause is unknown.
- Console parameter type and `min_version` mistakes took several rounds, and the parameter was left in a state that could break the scenario suite.

**What to change**
- Check whether a CLI/API (here the Firebase CLI, already logged in) can do the live-config work before asking the user to edit a console by hand; propose, apply, restore and read back. Added to `docs/workflows/FEATURE.md` step 1.4 and the ARCHITECTURE runbook.
- Run scenarios against a test Firebase environment instead of production (#147).

