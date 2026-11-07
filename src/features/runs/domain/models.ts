import { generateId } from '../../../shared/ids';
import { Checklist } from '../../checklists/domain/models';

export interface Attachment {
  id: string;
  kind: 'photo';
  /** Relative to the attachments root: the iOS container path changes between updates. */
  path: string;
  addedAt: string;
}

export interface RunItem {
  id: string;
  text: string;
  checked: boolean;
  photo: Attachment | null;
}

export type RunOrigin =
  | { readonly type: 'local' }
  | { readonly type: 'external'; readonly callbackUrl: string };

export interface ChecklistRun {
  id: string;
  checklistId: string;
  checklistTitle: string;
  items: RunItem[];
  photos: Attachment[];
  completedAt: string | null;
  origin: RunOrigin;
}

export type RunHistoryItem = RunItem;

export interface RunHistoryEntry {
  id: string;
  checklistId: string;
  checklistTitle: string;
  itemCount: number;
  completedAt: string;
  /** Absent on entries saved before photos existed: their details weren't recorded. */
  items?: RunHistoryItem[];
  photos?: Attachment[];
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
      photo: null,
    })),
    photos: [],
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
    items: run.items.map(i => ({
      id: i.id,
      text: i.text,
      checked: i.checked,
      photo: i.photo,
    })),
    photos: run.photos,
  };
}

export function checkedCount(run: ChecklistRun): number {
  return run.items.filter(i => i.checked).length;
}

export function attachItemPhoto(
  run: ChecklistRun,
  runItemId: string,
  attachment: Attachment,
): ChecklistRun {
  const item = run.items.find(i => i.id === runItemId);
  if (run.completedAt !== null || !item || item.photo !== null) {
    return run;
  }

  return {
    ...run,
    items: run.items.map(i =>
      i.id === runItemId ? { ...i, photo: attachment } : i,
    ),
  };
}

export function removeItemPhoto(
  run: ChecklistRun,
  attachmentId: string,
): ChecklistRun {
  if (run.completedAt !== null) {
    return run;
  }

  return {
    ...run,
    items: run.items.map(i =>
      i.photo?.id === attachmentId ? { ...i, photo: null } : i,
    ),
  };
}

export function addRunPhoto(
  run: ChecklistRun,
  attachment: Attachment,
): ChecklistRun {
  if (run.completedAt !== null) {
    return run;
  }

  return { ...run, photos: [...run.photos, attachment] };
}

export function removeRunPhoto(
  run: ChecklistRun,
  attachmentId: string,
): ChecklistRun {
  if (run.completedAt !== null) {
    return run;
  }

  return { ...run, photos: run.photos.filter(p => p.id !== attachmentId) };
}

type WithPhotos = {
  items?: readonly { photo: Attachment | null }[];
  photos?: readonly Attachment[];
};

export function runPhotoCount(run: WithPhotos): number {
  return run.photos?.length ?? 0;
}

/** Item photos plus run photos. */
export function photoCount(run: WithPhotos): number {
  const itemPhotos = run.items?.filter(i => i.photo !== null).length ?? 0;
  return itemPhotos + runPhotoCount(run);
}

export function findAttachment(
  run: WithPhotos,
  attachmentId: string,
): { attachment: Attachment; target: 'item' | 'run' } | null {
  for (const item of run.items ?? []) {
    if (item.photo?.id === attachmentId) {
      return { attachment: item.photo, target: 'item' };
    }
  }
  const attachment = run.photos?.find(p => p.id === attachmentId);
  return attachment ? { attachment, target: 'run' } : null;
}
