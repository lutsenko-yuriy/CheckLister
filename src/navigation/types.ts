export type RootStackParamList = {
  Home: undefined;
  ChecklistDetail: { checklistId: string };
  Run: { checklistId: string };
  // Params carry ids only; the screen looks the photo up through useRuns.
  PhotoViewer: {
    context: 'active_run' | 'past_run';
    runId: string;
    attachmentId: string;
  };
  RunDetail: { runId: string };
  RunHistory: { checklistId?: string; checklistTitle?: string };
  // No params: the pending callback URL is deliberately kept out of
  // navigation state (ephemeral, unpersisted) — see useExternalSelection.
  ChecklistSelect: undefined;
  Settings: undefined;
  // Registered under __DEV__ only (CheL-128).
  Debug: undefined;
  // Registered in scenario builds only (CheL-147).
  ScenarioEvents: undefined;
};
