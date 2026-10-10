# CheckLister

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Android scenarios](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/lutsenko-yuriy/4c1cf29720637d82c5d7262aa7bbac74/raw/scenarios.json)](https://github.com/lutsenko-yuriy/CheckLister/actions/workflows/scenarios-android.yml?query=branch%3Amain)

A personal checklist app for iOS and Android, built with React Native and TypeScript.

Checklists are reusable templates. You check items off in a run, and completed runs go
to a history. There are no accounts and no backend: all data stays on the device.
Other apps can start runs and get the results back through the
[`checklister://run` external-run contract](docs/EXTERNAL_RUNS.md).

## Running it

**Requires:** Node 22.11+, plus the
[React Native environment](https://reactnative.dev/docs/set-up-your-environment)
for your target platform (Xcode for iOS, the Android SDK and a JDK for Android).

```bash
npm install                                   # also applies patches/ via patch-package
npm start                                     # Metro bundler
npm run android                               # in a second terminal
```

For iOS, install the pods first:

```bash
bundle install                                # once, installs CocoaPods
cd ios && bundle exec pod install && cd ..    # after each native dependency change
npm run ios
```

See `docs/PRODUCT_SPEC.md` for the features and behaviour.

## Testing

```bash
npm test                                                    # Jest unit and component tests
npm run lint                                                # ESLint
npm run typecheck                                           # tsc --noEmit
npm run scenarios:ios -- <booted-simulator-udid>            # Maestro, iOS
npm run scenarios:android -- <running-emulator-serial>      # Maestro, Android
python3 -m unittest discover -s scripts/tests               # scenario and release tooling
python3 -m unittest discover -s scripts/onboard/tests -t .  # onboarding tooling
python3 -m unittest discover -s scripts/notes/tests -t .    # knowledge-base notes tooling
python3 -m unittest discover -s scripts/checkup/tests -t scripts  # checkup tooling
python3 -m unittest discover -s scripts/skill_router/tests -t scripts  # skill router
```

The scenarios need Maestro and a Release build installed on the device. A saved
baseline snapshot is optional but isolates test data. `docs/SCENARIOS.md` covers the setup.

Run the onboarding and skill router tests on Python 3.11+ for full coverage. Under 3.9 the `tomllib` tests are skipped.

## Architecture

Feature-based modules with React Navigation and local persistence:

- `src/features/checklists`: checklist templates and their items.
- `src/features/runs`: the active run and completed-run history.
- Each feature splits into `domain` (plain TypeScript), `data` (AsyncStorage repositories) and `ui`.
- `src/shared`: analytics, external-link URLs, storage, theme and shared UI.
- `packages/i18n`: translations (English, German, French, Russian), imported only as `@checklister/i18n`.

`App.tsx` is the composition root. See `docs/ARCHITECTURE.md` for the full layout and the
dependency rules.

## Working on this project with Claude Code

This repo uses the
[agentic-boyz](https://github.com/lutsenko-yuriy/yuriys-agentic-boyz)
multi-skill workflow. `AGENTS.md`, included via `CLAUDE.md`, is the
orchestrator. It points to the skills under `skills/` and to the project facts in `docs/`.
Issues and backlog live in [GitHub Issues](https://github.com/lutsenko-yuriy/CheckLister/issues).

**Requires:** `git`, `python3`, a Python 3.11+ interpreter, and an authenticated `gh` (`gh auth login`).
The gate runs on any `python3`, 3.9 included. Without `python3`, the gate denies every tool call, and `/onboard` can't fix that.
Onboarding's `check`, `apply` and `mark` need 3.11+ (for example `python3.12`). `/onboard` finds one on its own.

1. Open Claude Code **from the repo root**. Claude Code reads `.claude/settings.json` only
   from the directory it starts in. If you start it from a subdirectory, the gate hooks
   don't load.
2. Run `/onboard`. Until it finishes, a gate blocks most writes, other skills, subagents
   and shell commands. The project is already configured, so here it gives a short
   orientation and then writes a per-clone marker inside the git dir. The marker is never
   committed, so each collaborator runs `/onboard` once.
3. Start with `/summarize`.

If you change the configuration, commit and push it, so collaborators don't work from a stale one.
