import {
  createChecklist,
  countUnchecked,
  createItem,
  createSection,
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
        { id: '1', text: 'Milk', checked: true },
        { id: '2', text: 'Eggs', checked: false },
        { id: '3', text: 'Bread', checked: false },
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
