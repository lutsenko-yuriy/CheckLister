# Versioning

<!-- Describe your versioning strategy. Example below — adapt to your project. -->

This project follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

**Major** — breaking changes (incompatible data formats, dropped platform support).
**Minor** — new features added in a backwards-compatible manner.
**Patch** — backwards-compatible bug fixes.

Version bumps are manual and require user approval before any change.

## CI/CD

`package.json`'s `version` field is the single source of truth for the
app's version name (`CFBundleShortVersionString` on iOS). CI only ever
*reads* it — it never bumps it, and never invents a version of its own.

**PR validation** (`.github/workflows/pr-validation.yml`) runs on every pull
request: lint, typecheck, unit tests, script contract tests, a workflow-YAML
lint pass, and an unsigned iOS simulator build. No credentials involved.

**iOS release** (`.github/workflows/release-ios.yml`) runs on every push to
`main`. A `gate` job (`scripts/ci/release_gate.py`) decides whether the
commit warrants a release build — both conditions must hold:

1. `package.json`'s `version` changed since the previous commit, and
2. the newest `docs/CHANGELOG.md` section's tags include `[user]` or `[app]`
   (see `docs/workflows/MULTI_WU.md`'s CHANGELOG-tag rules — `[test]`,
   `[meta]`, `[ci]`, and `[wip]` never trigger a release).

Any repository state the gate can't classify (a decreased version, a
malformed/missing CHANGELOG tag, a shallow checkout) fails the job loudly
rather than silently skipping.

When the gate passes, a second job builds a signed Release archive via
Fastlane (`fastlane/Fastfile`, `beta` lane) and uploads it to TestFlight for
internal testing only — no App Store submission happens automatically.
**Promoting a TestFlight build to public App Store review is always a
manual, deliberate action taken directly in App Store Connect.**

The iOS build number (`CFBundleVersion`) is derived by CI as the GitHub
Actions run number (`github.run_number`) at build time — it is never
committed. This is strictly monotonic per repository and needs no state
file or App Store Connect lookup to stay unique and increasing.

Required GitHub Actions secrets for the release job: `APP_STORE_CONNECT_API_KEY_ID`,
`APP_STORE_CONNECT_API_ISSUER_ID`, `APP_STORE_CONNECT_API_KEY_P8`,
`IOS_DIST_CERTIFICATE_P12`, `IOS_DIST_CERTIFICATE_PASSWORD`,
`IOS_PROVISIONING_PROFILE`, `IOS_TEAM_ID`. These are manual, out-of-band
setup — no agent or workflow can provision them.

<!-- Describe your CI/CD pipeline here. -->
