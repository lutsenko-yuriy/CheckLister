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

export function normalizeChecklist(checklist: Checklist): Checklist {
  const validSectionIds = new Set(checklist.sections.map(s => s.id));
  const effectiveSectionId = (item: Item): string | null =>
    item.sectionId !== null && validSectionIds.has(item.sectionId)
      ? item.sectionId
      : null;

  const defaultItems = checklist.items.filter(
    item => effectiveSectionId(item) === null,
  );
  const sectionedItems = checklist.sections.flatMap(section =>
    checklist.items.filter(item => effectiveSectionId(item) === section.id),
  );

  return {
    ...checklist,
    items: [...defaultItems, ...sectionedItems],
  };
}

export function moveItem(
  checklist: Checklist,
  itemId: string,
  toSectionId: string | null,
  toIndex: number,
): Checklist {
  const item = checklist.items.find(i => i.id === itemId);
  if (!item) {
    return checklist;
  }

  const remaining = checklist.items.filter(i => i.id !== itemId);
  const movedItem: Item = { ...item, sectionId: toSectionId };

  const groupItems = remaining.filter(i => i.sectionId === toSectionId);
  const clampedIndex = Math.max(0, Math.min(toIndex, groupItems.length));
  const anchor = groupItems[clampedIndex];
  const insertAt = anchor
    ? remaining.findIndex(i => i.id === anchor.id)
    : remaining.length;

  const newItems = [
    ...remaining.slice(0, insertAt),
    movedItem,
    ...remaining.slice(insertAt),
  ];

  return normalizeChecklist({ ...checklist, items: newItems });
}

export function moveSection(
  checklist: Checklist,
  sectionId: string,
  toIndex: number,
): Checklist {
  const section = checklist.sections.find(s => s.id === sectionId);
  if (!section) {
    return checklist;
  }

  const remaining = checklist.sections.filter(s => s.id !== sectionId);
  const clampedIndex = Math.max(0, Math.min(toIndex, remaining.length));
  const newSections = [
    ...remaining.slice(0, clampedIndex),
    section,
    ...remaining.slice(clampedIndex),
  ];

  return normalizeChecklist({ ...checklist, sections: newSections });
}
