import {
  createChecklist,
  countUnchecked,
  createItem,
  createSection,
  normalizeChecklist,
  moveItem,
  moveSection,
  buildRows,
  resolveItemDrop,
  resolveSectionDrop,
  Checklist,
  Row,
} from './models';

describe('createChecklist', () => {
  it('creates a checklist with the given title and no items', () => {
    const checklist = createChecklist('Groceries');
    expect(checklist.title).toBe('Groceries');
    expect(checklist.items).toEqual([]);
    expect(checklist.id).toBeTruthy();
  });

  it('creates a checklist with no sections', () => {
    expect(createChecklist('Groceries').sections).toEqual([]);
  });

  it('generates a different id for each checklist', () => {
    const a = createChecklist('A');
    const b = createChecklist('B');
    expect(a.id).not.toBe(b.id);
  });
});

describe('countUnchecked', () => {
  it('returns 0 for a checklist with no items', () => {
    expect(countUnchecked(createChecklist('Empty'))).toBe(0);
  });

  it('counts only the unchecked items', () => {
    const checklist = {
      ...createChecklist('Groceries'),
      items: [
        { id: '1', text: 'Milk', checked: true, sectionId: null },
        { id: '2', text: 'Eggs', checked: false, sectionId: null },
        { id: '3', text: 'Bread', checked: false, sectionId: null },
      ],
    };
    expect(countUnchecked(checklist)).toBe(2);
  });
});

describe('createItem', () => {
  it('creates an item with the given text, unchecked', () => {
    const item = createItem('Milk');
    expect(item.text).toBe('Milk');
    expect(item.checked).toBe(false);
    expect(item.id).toBeTruthy();
  });

  it('generates a different id for each item', () => {
    const a = createItem('Milk');
    const b = createItem('Eggs');
    expect(a.id).not.toBe(b.id);
  });

  it('defaults to the default section (sectionId null) when none is given', () => {
    expect(createItem('Milk').sectionId).toBeNull();
  });

  it('assigns the given sectionId when provided', () => {
    expect(createItem('Milk', 'section-1').sectionId).toBe('section-1');
  });
});

describe('normalizeChecklist', () => {
  function checklist(overrides: Partial<Checklist>): Checklist {
    return { ...createChecklist('Groceries'), ...overrides };
  }

  it('keeps a checklist with no sections unchanged', () => {
    const c = checklist({
      items: [
        { id: 'a', text: 'Milk', checked: false, sectionId: null },
        { id: 'b', text: 'Eggs', checked: false, sectionId: null },
      ],
    });
    expect(normalizeChecklist(c).items.map(i => i.id)).toEqual(['a', 'b']);
  });

  it('places default-section (sectionId null) items before named-section items', () => {
    const produce = createSection('Produce');
    const c = checklist({
      sections: [produce],
      items: [
        { id: 'apple', text: 'Apple', checked: false, sectionId: produce.id },
        { id: 'milk', text: 'Milk', checked: false, sectionId: null },
      ],
    });
    expect(normalizeChecklist(c).items.map(i => i.id)).toEqual([
      'milk',
      'apple',
    ]);
  });

  it('orders named-section items by the order sections appear in `sections`', () => {
    const produce = createSection('Produce');
    const dairy = createSection('Dairy');
    const c = checklist({
      sections: [dairy, produce],
      items: [
        { id: 'apple', text: 'Apple', checked: false, sectionId: produce.id },
        { id: 'milk', text: 'Milk', checked: false, sectionId: dairy.id },
      ],
    });
    expect(normalizeChecklist(c).items.map(i => i.id)).toEqual([
      'milk',
      'apple',
    ]);
  });

  it('preserves relative order of items within the same section', () => {
    const produce = createSection('Produce');
    const c = checklist({
      sections: [produce],
      items: [
        { id: 'banana', text: 'Banana', checked: false, sectionId: produce.id },
        { id: 'apple', text: 'Apple', checked: false, sectionId: produce.id },
      ],
    });
    expect(normalizeChecklist(c).items.map(i => i.id)).toEqual([
      'banana',
      'apple',
    ]);
  });

  it('falls back items whose sectionId matches no current section to the default section', () => {
    const c = checklist({
      sections: [],
      items: [{ id: 'a', text: 'Milk', checked: false, sectionId: 'ghost' }],
    });
    expect(normalizeChecklist(c).items.map(i => i.id)).toEqual(['a']);
  });

  it('is idempotent', () => {
    const produce = createSection('Produce');
    const c = checklist({
      sections: [produce],
      items: [
        { id: 'milk', text: 'Milk', checked: false, sectionId: null },
        { id: 'apple', text: 'Apple', checked: false, sectionId: produce.id },
      ],
    });
    const once = normalizeChecklist(c);
    const twice = normalizeChecklist(once);
    expect(twice.items.map(i => i.id)).toEqual(once.items.map(i => i.id));
  });
});

describe('moveItem', () => {
  function checklist(overrides: Partial<Checklist>): Checklist {
    return { ...createChecklist('Groceries'), ...overrides };
  }

  it('reorders items within the same section', () => {
    const c = checklist({
      items: [
        { id: 'a', text: 'A', checked: false, sectionId: null },
        { id: 'b', text: 'B', checked: false, sectionId: null },
        { id: 'c', text: 'C', checked: false, sectionId: null },
      ],
    });
    const result = moveItem(c, 'a', null, 2);
    expect(result.items.map(i => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('moves an item into a different section', () => {
    const produce = createSection('Produce');
    const c = checklist({
      sections: [produce],
      items: [{ id: 'milk', text: 'Milk', checked: false, sectionId: null }],
    });
    const result = moveItem(c, 'milk', produce.id, 0);
    expect(result.items[0]).toEqual(
      expect.objectContaining({ id: 'milk', sectionId: produce.id }),
    );
  });

  it('is a no-op when the item does not exist', () => {
    const c = checklist({
      items: [{ id: 'a', text: 'A', checked: false, sectionId: null }],
    });
    expect(moveItem(c, 'missing', null, 0)).toEqual(c);
  });
});

describe('moveSection', () => {
  function checklist(overrides: Partial<Checklist>): Checklist {
    return { ...createChecklist('Groceries'), ...overrides };
  }

  it('reorders sections, carrying their items with them', () => {
    const produce = createSection('Produce');
    const dairy = createSection('Dairy');
    const c = checklist({
      sections: [produce, dairy],
      items: [
        { id: 'apple', text: 'Apple', checked: false, sectionId: produce.id },
        { id: 'milk', text: 'Milk', checked: false, sectionId: dairy.id },
      ],
    });
    const result = moveSection(c, dairy.id, 0);
    expect(result.sections.map(s => s.id)).toEqual([dairy.id, produce.id]);
    expect(result.items.map(i => i.id)).toEqual(['milk', 'apple']);
  });

  it('is a no-op when the section does not exist', () => {
    const c = checklist({ sections: [createSection('Produce')] });
    expect(moveSection(c, 'missing', 0)).toEqual(c);
  });
});

describe('createSection', () => {
  it('creates a section with the given name', () => {
    const section = createSection('Produce');
    expect(section.name).toBe('Produce');
    expect(section.id).toBeTruthy();
  });

  it('generates a different id for each section', () => {
    const a = createSection('Produce');
    const b = createSection('Dairy');
    expect(a.id).not.toBe(b.id);
  });
});

describe('buildRows', () => {
  function checklist(overrides: Partial<Checklist>): Checklist {
    return { ...createChecklist('Groceries'), ...overrides };
  }

  it('renders no header rows when the checklist has no named sections', () => {
    const milk = { id: 'milk', text: 'Milk', checked: false, sectionId: null };
    const rows = buildRows(checklist({ items: [milk] }));
    expect(rows).toEqual([{ kind: 'item', item: milk }]);
  });

  it('renders a default header once a named section exists, then each section header and its items', () => {
    const produce = createSection('Produce');
    const milk = { id: 'milk', text: 'Milk', checked: false, sectionId: null };
    const apple = {
      id: 'apple',
      text: 'Apple',
      checked: false,
      sectionId: produce.id,
    };
    const rows = buildRows(
      checklist({ sections: [produce], items: [milk, apple] }),
    );
    expect(rows).toEqual([
      { kind: 'section', section: null },
      { kind: 'item', item: milk },
      { kind: 'section', section: produce },
      { kind: 'item', item: apple },
    ]);
  });

  it('renders a section header with no item rows when the section is empty', () => {
    const produce = createSection('Produce');
    const rows = buildRows(checklist({ sections: [produce], items: [] }));
    expect(rows).toEqual([
      { kind: 'section', section: null },
      { kind: 'section', section: produce },
    ]);
  });
});

describe('resolveItemDrop', () => {
  it('resolves the position within the same (default) section', () => {
    const a = { id: 'a', text: 'A', checked: false, sectionId: null };
    const b = { id: 'b', text: 'B', checked: false, sectionId: null };
    const c = { id: 'c', text: 'C', checked: false, sectionId: null };
    // Dropped so B and C moved ahead of A: new order is B, C, A.
    const rows: Row[] = [
      { kind: 'item', item: b },
      { kind: 'item', item: c },
      { kind: 'item', item: a },
    ];
    expect(resolveItemDrop(rows, 'a')).toEqual({
      toSectionId: null,
      toIndex: 2,
    });
  });

  it('resolves the target section when dropped under a different header', () => {
    const produce = createSection('Produce');
    const milk = { id: 'milk', text: 'Milk', checked: false, sectionId: null };
    const apple = {
      id: 'apple',
      text: 'Apple',
      checked: false,
      sectionId: produce.id,
    };
    const rows: Row[] = [
      { kind: 'section', section: null },
      { kind: 'section', section: produce },
      { kind: 'item', item: apple },
      { kind: 'item', item: milk },
    ];
    expect(resolveItemDrop(rows, 'milk')).toEqual({
      toSectionId: produce.id,
      toIndex: 1,
    });
  });
});

describe('resolveSectionDrop', () => {
  it('resolves the new index among named sections', () => {
    const produce = createSection('Produce');
    const dairy = createSection('Dairy');
    const rows: Row[] = [
      { kind: 'section', section: null },
      { kind: 'section', section: dairy },
      { kind: 'section', section: produce },
    ];
    expect(resolveSectionDrop(rows, dairy.id)).toBe(0);
    expect(resolveSectionDrop(rows, produce.id)).toBe(1);
  });
});
