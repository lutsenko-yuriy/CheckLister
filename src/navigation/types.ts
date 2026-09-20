export type RootStackParamList = {
  Home: undefined;
  ChecklistDetail: { checklistId: string };
  Run: { checklistId: string };
  RunHistory: { checklistId?: string; checklistTitle?: string };
  // No params: the pending callback URL is deliberately kept out of
  // navigation state (ephemeral, unpersisted) — see useExternalSelection.
  ChecklistSelect: undefined;
};
