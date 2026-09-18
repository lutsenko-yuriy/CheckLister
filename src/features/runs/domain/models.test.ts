import { createChecklist, createItem } from '../../checklists/domain/models';
import {
  startRun,
  toggleRunItem,
  isRunComplete,
  completeRun,
  checkedCount,
  toRunHistoryEntry,
} from './models';

describe('startRun', () => {
  it('copies item text and order from the checklist', () => {
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk'), createItem('Eggs')],
    };

    const run = startRun(checklist);

    expect(run.items.map(i => i.text)).toEqual(['Milk', 'Eggs']);
  });

  it('sets every run item unchecked', () => {
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk'), createItem('Eggs')],
    };

    const run = startRun(checklist);

    expect(run.items.every(i => i.checked === false)).toBe(true);
  });

  it('gives run items fresh ids, distinct from the source items', () => {
    const item = createItem('Milk');
    const checklist = { ...createChecklist('Groceries'), items: [item] };

    const run = startRun(checklist);

    expect(run.items[0].id).not.toBe(item.id);
  });

  it('snapshots the checklist id and title', () => {
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk')],
    };

    const run = startRun(checklist);

    expect(run.checklistId).toBe(checklist.id);
    expect(run.checklistTitle).toBe('Groceries');
  });

  it('starts with completedAt as null', () => {
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk')],
    };

    const run = startRun(checklist);

    expect(run.completedAt).toBeNull();
  });
});

describe('toggleRunItem', () => {
  it('flips the checked state of the targeted item', () => {
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk'), createItem('Eggs')],
    };
    const run = startRun(checklist);

    const toggled = toggleRunItem(run, run.items[0].id);

    expect(toggled.items[0].checked).toBe(true);
  });

  it('leaves other items untouched', () => {
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk'), createItem('Eggs')],
    };
    const run = startRun(checklist);

    const toggled = toggleRunItem(run, run.items[0].id);

    expect(toggled.items[1].checked).toBe(false);
  });

  it('does not mutate the original run (immutability)', () => {
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk')],
    };
    const run = startRun(checklist);

    toggleRunItem(run, run.items[0].id);

    expect(run.items[0].checked).toBe(false);
  });

  it('returns the run unchanged when the id is unknown', () => {
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk')],
    };
    const run = startRun(checklist);

    const result = toggleRunItem(run, 'not-a-real-id');

    expect(result).toEqual(run);
  });

  it('toggling twice returns the item to its original state', () => {
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk')],
    };
    const run = startRun(checklist);

    const result = toggleRunItem(
      toggleRunItem(run, run.items[0].id),
      run.items[0].id,
    );

    expect(result.items[0].checked).toBe(false);
  });
});

describe('isRunComplete', () => {
  it('is false when any item is unchecked', () => {
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk'), createItem('Eggs')],
    };
    const run = startRun(checklist);
    const partiallyChecked = toggleRunItem(run, run.items[0].id);

    expect(isRunComplete(partiallyChecked)).toBe(false);
  });

  it('is false for an empty run', () => {
    const checklist = createChecklist('Empty');
    const run = startRun(checklist);

    expect(isRunComplete(run)).toBe(false);
  });

  it('is true when every item is checked', () => {
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk'), createItem('Eggs')],
    };
    const run = startRun(checklist);
    const allChecked = run.items.reduce(
      (acc, item) => toggleRunItem(acc, item.id),
      run,
    );

    expect(isRunComplete(allChecked)).toBe(true);
  });
});

describe('completeRun', () => {
  it('stamps completedAt with the injected date', () => {
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk')],
    };
    const run = startRun(checklist);
    const now = new Date('2026-09-18T12:00:00.000Z');

    const completed = completeRun(run, now);

    expect(completed.completedAt).toBe(now.toISOString());
  });

  it('creates an immutable history summary from the completed snapshot', () => {
    const checklist = {
      ...createChecklist('Groceries'),
      id: 'checklist-1',
      items: [createItem('Milk'), createItem('Eggs')],
    };
    const completed = completeRun(
      startRun(checklist),
      new Date('2026-09-18T12:00:00.000Z'),
    );

    expect(toRunHistoryEntry(completed)).toEqual({
      id: completed.id,
      checklistId: 'checklist-1',
      checklistTitle: 'Groceries',
      itemCount: 2,
      completedAt: '2026-09-18T12:00:00.000Z',
    });
  });

  it('refuses to create history for an unfinished run', () => {
    const run = startRun(createChecklist('Empty'));

    expect(() => toRunHistoryEntry(run)).toThrow(
      'Cannot create history for an unfinished run',
    );
  });
});

describe('checkedCount', () => {
  it('counts zero when nothing is checked', () => {
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk'), createItem('Eggs')],
    };
    const run = startRun(checklist);

    expect(checkedCount(run)).toBe(0);
  });

  it('counts only checked items', () => {
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk'), createItem('Eggs'), createItem('Bread')],
    };
    const run = startRun(checklist);
    const withOneChecked = toggleRunItem(run, run.items[0].id);

    expect(checkedCount(withOneChecked)).toBe(1);
  });
});
