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
| Integration test directory | `e2e/` (not yet added; e.g. Detox) |
| Test harness file | `N/A` (no integration harness yet) |
| Harness class / entry point | `N/A` |
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
