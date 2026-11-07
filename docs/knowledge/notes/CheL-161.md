# CheL-161: Attach photos to checklist run items and runs

## Notes

- 2026-11-07: When a new dependency is introduced, the plan should also consider its licensing and any other legal aspects (not only technical fit). Raised by the user after the plan proposed react-native-image-picker and @dr.pogodin/react-native-fs; licenses were only checked after the plan was approved.
- 2026-11-07: The plan chose @dr.pogodin/react-native-fs 2.41.0 after checking only its license and iOS/Android fit on paper. In WU1 its Android build failed on our React Native 0.87.1 (codegen: "ArrayBuffer is only supported for C++ TurboModules"; the package itself builds against RN 0.88), so the user approved switching to react-native-file-access (MIT, from the plan's alternatives). Next time, when a plan proposes a native dependency, check its supported React Native version range and build it on both platforms (a throwaway install plus a Gradle/Xcode build) before the plan is approved, not in the first implementation work unit.

## Debrief summary
