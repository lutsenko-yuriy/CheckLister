import { NativeModules } from 'react-native';

interface ExternalRunLinkingModule {
  activate(): Promise<string[]>;
  deactivate(): void;
}

// The native module is still registered as "ExternalRunLinking" — it
// predates the `select` verb (CheL-40) and renaming it would churn Swift,
// Objective-C and Kotlin package-registration files for no behavioural
// gain. It now hands off both `run` and `select` URLs.
const externalLinking = NativeModules.ExternalRunLinking as
  | ExternalRunLinkingModule
  | undefined;

export async function activateExternalLinkHandoff(): Promise<string[]> {
  return externalLinking?.activate() ?? [];
}

export function deactivateExternalLinkHandoff(): void {
  externalLinking?.deactivate();
}
