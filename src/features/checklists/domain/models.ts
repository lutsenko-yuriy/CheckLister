import { generateId } from '../../../shared/ids';

export interface Item {
  id: string;
  text: string;
  checked: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  items: Item[];
}

export function createChecklist(title: string): Checklist {
  return {
    id: generateId(),
    title,
    items: [],
  };
}

export function countUnchecked(checklist: Checklist): number {
  return checklist.items.filter(item => !item.checked).length;
}
