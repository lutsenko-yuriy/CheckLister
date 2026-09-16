import { createChecklist, countUnchecked } from './models';

describe('createChecklist', () => {
  it('creates a checklist with the given title and no items', () => {
    const checklist = createChecklist('Groceries');
    expect(checklist.title).toBe('Groceries');
    expect(checklist.items).toEqual([]);
    expect(checklist.id).toBeTruthy();
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
