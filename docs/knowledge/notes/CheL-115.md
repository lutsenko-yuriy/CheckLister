---
bookmarks: [scenario-suite-timing-flakiness]
---

# CheL-115: Speed up the Android scenarios CI workflow (~20 min per run)

## Notes

- 2026-11-04: The ticket's premise was stale. It said the Gradle cache never warms because the workflow doesn't run on `main`; by pickup, `main` pushes already wrote it and PR runs restored it, yet the build still took ~510s. The cost was native CMake and Kotlin compilation. ccache on those got 0/100 cacheable hits and was dropped; `--parallel`, a 4 GB heap and `-x lintVitalRelease` took the build to ~360s.
- 2026-11-04: I spent the first hour on the Android build; the iOS simulator build on PRs was an equally slow (~20 min) check and was only looked at because the user asked.
- 2026-11-04: Repeated slip: I built a `scope` job to work around `paths:` being evaluated against the whole PR diff (already noted under CheL-100), then dropped it when the user chose main-only runs.

## Debrief summary

### 2026-11-04

**What went well**
- Measuring before choosing: ccache was dropped on evidence, not kept on hope.
- The user's call to run the slow suites on `main` only removed ~20 min per PR, more than any tuning could.

**What was hard or surprising**
- The ticket had sat since CheL-100 and its premises no longer held; `/brief` should have been run first to refresh it.
- The Android build was not the only slow check: the PR's iOS simulator build was just as long.

**What to change**
- `FEATURE.md` step 1.1: run `/brief CheL-N` on a long-stale ticket before planning on it.
- `FEATURE.md` CI note: for "CI is slow" tickets, list every check a PR waits on with timings first and start from the slowest.
