# CheL-125: Run notes and checkup Python tests in CI

## Notes

## Debrief summary

### 2026-11-05

**What went well**
- Quick and smooth. The suites were run locally on Python 3.9 and 3.12 first, including the `-t scripts` versus `-t .` discovery difference the ticket warned about, so the CI jobs passed on their first run.
- The notes and checkup tests now run in CI alongside the onboard and skill_router suites.

**What was hard or surprising**
- Nothing notable.

**What to change**
- No workflow or skill changes.
