import { generateId } from '../../../shared/ids';

export interface Item {
  id: string;
  text: string;
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

export function createItem(text: string): Item {
  return {
    id: generateId(),
    text,
  };
}

export function moveItem(
  checklist: Checklist,
  itemId: string,
  toIndex: number,
): Checklist {
  const item = checklist.items.find(i => i.id === itemId);
  if (!item) {
    return checklist;
  }

  const remaining = checklist.items.filter(i => i.id !== itemId);
  const clampedIndex = Math.max(0, Math.min(toIndex, remaining.length));
  const newItems = [
    ...remaining.slice(0, clampedIndex),
    item,
    ...remaining.slice(clampedIndex),
  ];

  return { ...checklist, items: newItems };
}
