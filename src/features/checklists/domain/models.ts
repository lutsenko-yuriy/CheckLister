import { generateId } from '../../../shared/ids';

export interface Item {
  id: string;
  text: string;
  checked: boolean;
  sectionId: string | null;
}

export interface Section {
  id: string;
  name: string;
}

export interface Checklist {
  id: string;
  title: string;
  items: Item[];
  sections: Section[];
}

export function createChecklist(title: string): Checklist {
  return {
    id: generateId(),
    title,
    items: [],
    sections: [],
  };
}

export function countUnchecked(checklist: Checklist): number {
  return checklist.items.filter(item => !item.checked).length;
}

export function createItem(text: string, sectionId: string | null = null): Item {
  return {
    id: generateId(),
    text,
    checked: false,
    sectionId,
  };
}

export function createSection(name: string): Section {
  return {
    id: generateId(),
    name,
  };
}
