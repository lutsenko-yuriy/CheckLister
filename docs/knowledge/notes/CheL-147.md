# CheL-147: Run scenarios against stubbed Firebase (kill-switches + analytics), not production

## Notes

## Debrief summary

### 2026-11-05

**What went well**
- The plan flagged the build variant up front, and the split into WU0 plus four WUs let each layer (flag and guards, build plumbing, kill-switch stub, analytics stub) be merged and verified alone.
- The pinning test for the dummy Firebase key made fixing the launch crash cheap and keeps it from regressing.
- The 15-minute iOS suite overlapped with other work, with Android running on CI in parallel, so it cost little.

**What was hard or surprising**
- It is a standard test double, but made at build time: the app is a black box driven by Maestro and the Firebase SDKs start natively before any JS runs, so the swap is baked into the binary (build flag, dummy configs, release guards), not injected by a mocking framework.
- The dummy Firebase API key from WU2 passed every check and only crashed on the first real iOS launch in WU3 (FIRInstallations key validation).
- Android needed a manifest placeholder for the `scenarios` link host, because there is no `scenarios` flavor.

**What to change**
- `MULTI_WU.md`: a WU that adds a build variant or swaps a native config must launch the built app once before its PR.
- `SCENARIOS.md`: the dummy API key rules are documented next to the build instructions.
