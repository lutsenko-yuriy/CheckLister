import { generateId } from '../../../shared/ids';
import { Checklist } from '../../checklists/domain/models';

export interface RunItem {
  id: string;
  text: string;
  checked: boolean;
}

export type RunOrigin =
  | { readonly type: 'local' }
  | { readonly type: 'external'; readonly callbackUrl: string };

export interface ChecklistRun {
  id: string;
  checklistId: string;
  checklistTitle: string;
  items: RunItem[];
  completedAt: string | null;
  origin: RunOrigin;
}

export interface RunHistoryEntry {
  id: string;
  checklistId: string;
  checklistTitle: string;
  itemCount: number;
  completedAt: string;
}

export function startRun(
  checklist: Checklist,
  origin: RunOrigin = { type: 'local' },
): ChecklistRun {
  return {
    id: generateId(),
    checklistId: checklist.id,
    checklistTitle: checklist.title,
    items: checklist.items.map(item => ({
      id: generateId(),
      text: item.text,
      checked: false,
    })),
    completedAt: null,
    origin,
  };
}

export function toggleRunItem(
  run: ChecklistRun,
  runItemId: string,
): ChecklistRun {
  const item = run.items.find(i => i.id === runItemId);
  if (!item) {
    return run;
  }

  return {
    ...run,
    items: run.items.map(i =>
      i.id === runItemId ? { ...i, checked: !i.checked } : i,
    ),
  };
}

export function isRunComplete(run: ChecklistRun): boolean {
  return run.items.length > 0 && run.items.every(i => i.checked);
}

export function completeRun(run: ChecklistRun, now: Date): ChecklistRun {
  return { ...run, completedAt: now.toISOString() };
}

export function toRunHistoryEntry(run: ChecklistRun): RunHistoryEntry {
  if (!run.completedAt) {
    throw new Error('Cannot create history for an unfinished run');
  }

  return {
    id: run.id,
    checklistId: run.checklistId,
    checklistTitle: run.checklistTitle,
    itemCount: run.items.length,
    completedAt: run.completedAt,
  };
}

export function checkedCount(run: ChecklistRun): number {
  return run.items.filter(i => i.checked).length;
}
