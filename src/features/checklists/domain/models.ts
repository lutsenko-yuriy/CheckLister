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

// The flat, drag-ordered view of a checklist: a header row for each named
// section (plus the implicit default section, once there's at least one
// named section to distinguish it from) followed by that section's items.
export type Row =
  | { kind: 'section'; section: Section | null }
  | { kind: 'item'; item: Item };

export function buildRows(checklist: Checklist): Row[] {
  const defaultItems = checklist.items.filter(item => item.sectionId === null);
  const rows: Row[] = [];

  if (checklist.sections.length > 0) {
    rows.push({ kind: 'section', section: null });
  }
  rows.push(...defaultItems.map(item => ({ kind: 'item' as const, item })));

  for (const section of checklist.sections) {
    rows.push({ kind: 'section', section });
    rows.push(
      ...checklist.items
        .filter(item => item.sectionId === section.id)
        .map(item => ({ kind: 'item' as const, item })),
    );
  }

  return rows;
}

// Given the reordered flat rows from a completed item drag, resolves which
// section the dropped item now belongs to and its position within that
// section — the shape `moveItem` expects.
export function resolveItemDrop(
  rows: Row[],
  itemId: string,
): { toSectionId: string | null; toIndex: number } {
  const droppedAt = rows.findIndex(
    row => row.kind === 'item' && row.item.id === itemId,
  );

  let toSectionId: string | null = null;
  for (let i = droppedAt - 1; i >= 0; i -= 1) {
    const row = rows[i];
    if (row.kind === 'section') {
      toSectionId = row.section ? row.section.id : null;
      break;
    }
  }

  let toIndex = 0;
  for (let i = 0; i < droppedAt; i += 1) {
    const row = rows[i];
    if (row.kind === 'item' && row.item.sectionId === toSectionId) {
      toIndex += 1;
    }
  }

  return { toSectionId, toIndex };
}

// Given the reordered flat rows from a completed section-header drag,
// resolves the section's new index among named sections — the shape
// `moveSection` expects. The default section has no row of its own to drag.
export function resolveSectionDrop(rows: Row[], sectionId: string): number {
  const droppedAt = rows.findIndex(
    row => row.kind === 'section' && row.section?.id === sectionId,
  );

  let toIndex = 0;
  for (let i = 0; i < droppedAt; i += 1) {
    const row = rows[i];
    if (row.kind === 'section' && row.section !== null) {
      toIndex += 1;
    }
  }

  return toIndex;
}
