# Tech Stack

Agents read this file to know which languages, tools and platforms the project uses.

## Languages

| Language | Version | Used for |
|---|---|---|
| TypeScript | 6.0 (`package.json`) | Application code under `src/`, `App.tsx`, tests |
| JavaScript | Node >= 22.11.0 (`package.json` `engines`) | Build and test config (`babel`, `metro`, `jest`, `.eslintrc.js`), `index.js`, `__mocks__/` |
| Kotlin | 2.2.0 (`android/build.gradle`) | Android native shell and the external-run linking module |
| Swift | 5.0 (`ios/CheckLister.xcodeproj`) | iOS `AppDelegate` and the external-run linking module |
| Objective-C | n/a (`ios/CheckLister/ExternalRunLinking.m`) | React Native bridge declaration for the Swift module |
| Ruby | 3.4 in CI (`.github/workflows/pr-validation.yml`) | `Gemfile`, `ios/Podfile`, `fastlane/Fastfile` |
| Python | 3.9 and 3.12 in CI (`.github/workflows/tests.yml`) | Agent tooling under `scripts/` (onboarding, notes, checkup, skill router) |
| Shell | bash (`scripts/*.sh`) | Maestro scenario runners, onboarding gate wrapper |

## Frameworks and libraries

- [React Native](https://reactnative.dev/) 0.87.1 with [React](https://react.dev/) 19.2.3
- [React Navigation](https://reactnavigation.org/) 7 (native stack)
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) for local persistence
- [Reanimated](https://docs.swmansion.com/react-native-reanimated/) 4, [Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/) 3 and `react-native-reanimated-dnd` for drag reorder
- [react-native-localize](https://github.com/zoontek/react-native-localize) plus the in-house `packages/i18n` workspace
- [Maestro](https://maestro.mobile.dev/) for installed-app scenarios (`.maestro/`)

## Platforms

- iOS 15.1+ (`IPHONEOS_DEPLOYMENT_TARGET`)
- Android: minSdk 24, targetSdk 36, compileSdk 37 (`android/build.gradle`)

## Tooling

- **Build / package manager:** npm (workspaces); Gradle 9.4.1 for Android; CocoaPods via Bundler for iOS; fastlane for TestFlight releases
- **Test runner:** Jest with `@testing-library/react-native`; Maestro for scenarios; `unittest` for Python tooling
- **Linter / formatter:** ESLint (`@react-native/eslint-config`) and Prettier; `tsc --noEmit` for typechecking; actionlint for workflows
- **CI:** GitHub Actions (`pr-validation.yml`, `tests.yml`, `scenarios-android.yml`, `release-ios.yml`)
