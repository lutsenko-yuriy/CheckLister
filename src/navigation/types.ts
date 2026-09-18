export type RootStackParamList = {
  Home: undefined;
  ChecklistDetail: { checklistId: string };
  Run: { checklistId: string };
  RunHistory: { checklistId?: string; checklistTitle?: string };
};
