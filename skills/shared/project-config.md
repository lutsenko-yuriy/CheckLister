# Project Config

Read this file to resolve all project-specific constants referenced in skill instructions.
When setting up the project, fill in every `{{placeholder}}`. Skills stay unchanged.

## Source control

| Setting | Value |
|---|---|
| Git host | `GitHub` (e.g. GitHub, GitLab, Bitbucket) |

## Tech stack

| Layer | Technology |
|---|---|
| Framework | `React Native 0.87 / TypeScript` |
| State management | `React built-in state (useState/useContext)` — revisit if complexity grows |
| Local persistence | `@react-native-async-storage/async-storage` (not yet added) |

## Project management

@skills/shared/pm-tool-mapping.md

## Documentation paths

| Document | Path |
|---|---|
| Product spec | `docs/PRODUCT_SPEC.md` |
| Glossary | `docs/GLOSSARY.md` |
| Backlog | `docs/BACKLOG.md` |
| Changelog | `docs/CHANGELOG.md` |
| Architecture | `docs/ARCHITECTURE.md` |
| Agent workflow | `AGENTS.md` |
| Knowledge base | `docs/knowledge/notes/` (one `N/A-XX.md` file per ticket) |

## Testing

| Setting | Value |
|---|---|
| Simulator scenarios | `.maestro/*.yaml`, reusable helpers in `.maestro/helpers/`; `npm run scenarios:ios -- <UDID>` (see `docs/SCENARIOS.md`). Android automation is tracked in CheL-31. |
| Scenario policy | `docs/workflows/SCENARIOS.md` — applies to every ticket, with verification appropriate to its scope. |
| Integration test directory | Colocated `*.test.tsx` files next to each screen/component under `src/features/<feature>/ui/` (component integration tests; real-device flows are in `.maestro/`) |
| Test harness file | `@testing-library/react-native` — component-level integration tests render a full screen and drive it via user-facing queries/interactions, Maestro provides separate real-simulator scenario coverage |
| Harness class / entry point | `render()` / `fireEvent` from `@testing-library/react-native`, e.g. as used in `src/features/checklists/ui/ChecklistDetailScreen.test.tsx` |
| Unit / integration test command | `npm test` (Jest, via `@react-native/jest-preset`) |

## Version management

| Setting | Value |
|---|---|
| Version file | `package.json` (JS version); `android/app/build.gradle` + `ios/CheckLister/Info.plist` (native build numbers) |
| Version field | `version` in `package.json` |
| Manual vs automated | Bump version name manually; CI manages build numbers — never touch them |

## In QA path patterns

A merged PR moves to **In QA** (not Done directly) if it touches any of:

- `ios/`, `android/` — native project changes
- `App.tsx`, `index.js` — app entry points
- any new native module or third-party SDK integration

Move straight to **Done** if the PR touches only: pure logic with no runtime platform dependency, documentation, CI config, or pure refactors where automated tests fully own correctness. When in doubt, use **In QA**.
