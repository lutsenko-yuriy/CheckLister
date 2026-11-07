import { createChecklist, createItem } from '../../checklists/domain/models';
import {
  startRun,
  toggleRunItem,
  isRunComplete,
  completeRun,
  checkedCount,
  toRunHistoryEntry,
  Attachment,
  attachItemPhoto,
  removeItemPhoto,
  addRunPhoto,
  removeRunPhoto,
  photoCount,
  runPhotoCount,
  findAttachment,
} from './models';

const photo = (id: string): Attachment => ({
  id,
  kind: 'photo',
  path: `run-1/${id}.jpg`,
  addedAt: '2026-11-07T10:00:00.000Z',
});

const runWithTwoItems = () =>
  startRun({
    ...createChecklist('Groceries'),
    items: [createItem('Milk'), createItem('Eggs')],
  });

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

  it('marks an ordinary run with a local origin', () => {
    const run = startRun(createChecklist('Groceries'));

    expect(run.origin).toEqual({ type: 'local' });
  });

  it('keeps the supplied external origin on the active run', () => {
    const run = startRun(createChecklist('Groceries'), {
      type: 'external',
      callbackUrl: 'caller-app://run-result',
    });

    expect(run.origin).toEqual({
      type: 'external',
      callbackUrl: 'caller-app://run-result',
    });
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
      items: completed.items.map(i => ({
        id: i.id,
        text: i.text,
        checked: i.checked,
        photo: null,
      })),
      photos: [],
    });
  });

  it('snapshots items, checked states and photos', () => {
    let run = runWithTwoItems();
    run = toggleRunItem(run, run.items[0].id);
    run = attachItemPhoto(run, run.items[1].id, photo('a'));
    run = addRunPhoto(run, photo('b'));

    const entry = toRunHistoryEntry(completeRun(run, new Date()));

    expect(entry.items?.map(i => [i.text, i.checked, i.photo?.id])).toEqual([
      ['Milk', true, undefined],
      ['Eggs', false, 'a'],
    ]);
    expect(entry.photos?.map(p => p.id)).toEqual(['b']);
  });

  it('does not copy external origin data into run history', () => {
    const completed = completeRun(
      startRun(createChecklist('Groceries'), {
        type: 'external',
        callbackUrl: 'caller-app://run-result?secret=value',
      }),
      new Date('2026-09-18T12:00:00.000Z'),
    );

    expect(toRunHistoryEntry(completed)).not.toHaveProperty('origin');
    expect(JSON.stringify(toRunHistoryEntry(completed))).not.toContain(
      'caller-app',
    );
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

describe('run photos', () => {
  it('starts every run with no photos', () => {
    const run = runWithTwoItems();

    expect(run.items.every(i => i.photo === null)).toBe(true);
    expect(run.photos).toEqual([]);
  });

  it('attaches a photo to an item', () => {
    const run = runWithTwoItems();

    const updated = attachItemPhoto(run, run.items[0].id, photo('a'));

    expect(updated.items[0].photo?.id).toBe('a');
    expect(updated.items[1].photo).toBeNull();
  });

  it('keeps only one photo per item', () => {
    const run = runWithTwoItems();
    const once = attachItemPhoto(run, run.items[0].id, photo('a'));

    expect(attachItemPhoto(once, run.items[0].id, photo('b'))).toBe(once);
  });

  it('ignores an unknown item', () => {
    const run = runWithTwoItems();

    expect(attachItemPhoto(run, 'nope', photo('a'))).toBe(run);
  });

  it('does not change a completed run', () => {
    const run = completeRun(runWithTwoItems(), new Date());

    expect(attachItemPhoto(run, run.items[0].id, photo('a'))).toBe(run);
    expect(addRunPhoto(run, photo('a'))).toBe(run);
    expect(removeItemPhoto(run, 'a')).toBe(run);
    expect(removeRunPhoto(run, 'a')).toBe(run);
  });

  it('adds several run photos in order', () => {
    const run = addRunPhoto(
      addRunPhoto(runWithTwoItems(), photo('a')),
      photo('b'),
    );

    expect(run.photos.map(p => p.id)).toEqual(['a', 'b']);
  });

  it('removes an item photo by attachment id', () => {
    const base = runWithTwoItems();
    const run = attachItemPhoto(base, base.items[0].id, photo('a'));

    expect(removeItemPhoto(run, 'a').items[0].photo).toBeNull();
  });

  it('removes a run photo by attachment id', () => {
    const run = addRunPhoto(
      addRunPhoto(runWithTwoItems(), photo('a')),
      photo('b'),
    );

    expect(removeRunPhoto(run, 'a').photos.map(p => p.id)).toEqual(['b']);
  });

  it('counts item photos plus run photos', () => {
    const base = runWithTwoItems();
    let run = attachItemPhoto(base, base.items[0].id, photo('a'));
    run = attachItemPhoto(run, base.items[1].id, photo('b'));
    run = addRunPhoto(run, photo('c'));

    expect(photoCount(run)).toBe(3);
    expect(runPhotoCount(run)).toBe(1);
  });

  it('counts photos of a history entry', () => {
    const base = runWithTwoItems();
    const run = addRunPhoto(
      attachItemPhoto(base, base.items[0].id, photo('a')),
      photo('b'),
    );
    const entry = toRunHistoryEntry(completeRun(run, new Date()));

    expect(photoCount(entry)).toBe(2);
    expect(photoCount({ ...entry, items: undefined, photos: undefined })).toBe(
      0,
    );
  });

  it('finds an attachment and its target', () => {
    const base = runWithTwoItems();
    const run = addRunPhoto(
      attachItemPhoto(base, base.items[0].id, photo('a')),
      photo('b'),
    );

    expect(findAttachment(run, 'a')?.target).toBe('item');
    expect(findAttachment(run, 'b')?.target).toBe('run');
    expect(findAttachment(run, 'b')?.attachment.id).toBe('b');
    expect(findAttachment(run, 'zzz')).toBeNull();
  });
});
