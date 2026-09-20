import { NativeModules } from 'react-native';

interface ExternalRunLinkingModule {
  activate(): Promise<string[]>;
  deactivate(): void;
}

const externalRunLinking = NativeModules.ExternalRunLinking as
  | ExternalRunLinkingModule
  | undefined;

export async function activateExternalRunLinkHandoff(): Promise<string[]> {
  return externalRunLinking?.activate() ?? [];
}

export function deactivateExternalRunLinkHandoff(): void {
  externalRunLinking?.deactivate();
}
