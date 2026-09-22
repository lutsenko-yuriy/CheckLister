# CheL-31: Smoke tests: local Android emulator coverage

## Notes

## Debrief summary

### 2026-09-22

**What went well**
- Fully self-directed across both work units: WU1 (appId/tags refactor) and WU2 (Android runner, system-back flow, real-emulator verification) were planned, implemented, tested, reviewed, and merged with no back-and-forth — the user's only involvement was reviewing finished PRs. The two-WU split (refactor first, then the genuinely riskier Android-target work) let WU2 land on top of a known-good, independently verified iOS baseline.
- The predictive-back risk flagged during planning (targetSdk 36, no `android:enableOnBackInvokedCallback` override potentially bypassing `usePreventRemove`) was verified empirically on a real `Pixel_5_API36` emulator rather than left as a guess or hedged around in code — it did not materialize, so no unnecessary defensive code or follow-up ticket was added.
- Booting a real emulator, building a signed Release APK, and running the full Maestro suite twice consecutively (plus an iOS regression run) all worked smoothly once the emulator's first-run crash-consent dialog was bypassed with `-no-metrics -crash-report-mode disabled`.

**What was hard or surprising**
- Nothing significant — the user did not notice any friction in the finished work.

**What to change**
- Nothing flagged — keep doing this.
