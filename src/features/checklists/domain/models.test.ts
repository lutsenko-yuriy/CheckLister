import {
  createChecklist,
  countUnchecked,
  createItem,
  createSection,
  normalizeChecklist,
  Checklist,
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
