# Versioning

<!-- Describe your versioning strategy. Example below — adapt to your project. -->

This project follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

**Major** — breaking changes (incompatible data formats, dropped platform support).
**Minor** — new features added in a backwards-compatible manner.
**Patch** — backwards-compatible bug fixes.

Version bumps are manual and require user approval before any change. The version file only
ever moves for a `docs/CHANGELOG.md` entry carrying a `[user]` or `[app]` tag — see "The
`[Unreleased]` section" below for where every other entry goes instead.

## The `[Unreleased]` section

A `docs/CHANGELOG.md` entry that carries no `[user]`/`[app]` tag (i.e. only `[ci]`, `[meta]`,
`[test]`, and/or `[wip]`) never gets its own numbered `## [X.Y.Z]` heading — it's appended as a
bullet under a `## [Unreleased]` heading at the top of the file instead (create the heading if it
doesn't exist yet), and `package.json`'s version is left untouched. This generalizes the
`[wip]`-only convention `docs/workflows/MULTI_WU.md` already describes for intermediate multi-WU
merges to every non-user-facing entry, single-WU or not — one mechanism, not two.

The next time an entry *does* carry `[user]`/`[app]`, `ship` converts `## [Unreleased]` into the
real `## [X.Y.Z] — YYYY-MM-DD (PR #N merged)` heading, folding in whatever bullets were already
waiting there alongside the new one, and bumps the version to match.

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

The workflow can also be run manually (`workflow_dispatch`, e.g. via
"Run workflow" in the Actions tab or `gh workflow run "iOS release"`),
which always proceeds to the TestFlight upload regardless of what the
gate decided — useful for re-verifying the pipeline itself without
needing a fresh version bump.

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
