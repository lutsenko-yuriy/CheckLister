import { createChecklist, createItem, moveItem, Checklist } from './models';

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

describe('createItem', () => {
  it('creates an item with the given text', () => {
    const item = createItem('Milk');
    expect(item.text).toBe('Milk');
    expect(item.id).toBeTruthy();
  });

  it('generates a different id for each item', () => {
    const a = createItem('Milk');
    const b = createItem('Eggs');
    expect(a.id).not.toBe(b.id);
  });
});

describe('moveItem', () => {
  function checklist(overrides: Partial<Checklist>): Checklist {
    return { ...createChecklist('Groceries'), ...overrides };
  }

  it('reorders items to the given index', () => {
    const c = checklist({
      items: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
        { id: 'c', text: 'C' },
      ],
    });
    const result = moveItem(c, 'a', 2);
    expect(result.items.map(i => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('is a no-op when the item does not exist', () => {
    const c = checklist({
      items: [{ id: 'a', text: 'A' }],
    });
    expect(moveItem(c, 'missing', 0)).toEqual(c);
  });

  it('clamps an out-of-range index to the end of the list', () => {
    const c = checklist({
      items: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
    });
    const result = moveItem(c, 'a', 99);
    expect(result.items.map(i => i.id)).toEqual(['b', 'a']);
  });
});
