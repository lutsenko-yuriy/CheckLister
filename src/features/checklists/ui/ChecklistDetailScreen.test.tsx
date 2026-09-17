import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from '@testing-library/react-native';
import { ChecklistsProvider } from '../useChecklists';
import { AsyncStorageChecklistRepository } from '../data/asyncStorageChecklistRepository';
import { ChecklistDetailScreen } from './ChecklistDetailScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

async function renderDetailScreen(checklistId: string) {
  return render(
    <ChecklistsProvider repository={new AsyncStorageChecklistRepository()}>
      <ChecklistDetailScreen
        navigation={{ setOptions: jest.fn() } as any}
        route={{ params: { checklistId } } as any}
      />
    </ChecklistsProvider>,
  );
}

describe('ChecklistDetailScreen', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it("shows the checklist's title and a placeholder for items", async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      { id: '1', title: 'Groceries', items: [], sections: [] },
    ]);

    await renderDetailScreen('1');

    await waitFor(() => expect(screen.getByText('Groceries')).toBeTruthy());
    expect(screen.getByText(/no items yet/i)).toBeTruthy();
  });

  it('shows a not-found message if the checklist no longer exists', async () => {
    await renderDetailScreen('missing');

    await waitFor(() =>
      expect(screen.getByText(/checklist not found/i)).toBeTruthy(),
    );
  });

  it('adds an item from the input and clears it afterwards', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      { id: '1', title: 'Groceries', items: [], sections: [] },
    ]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByPlaceholderText('New item'));

    await fireEvent.changeText(screen.getByPlaceholderText('New item'), 'Milk');
    await fireEvent.press(screen.getByText('Add'));

    await waitFor(() => expect(screen.getByText('Milk')).toBeTruthy());
    expect(screen.getByPlaceholderText('New item').props.value).toBe('');
  });

  it("toggles an item's checked style when tapped", async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [{ id: 'a', text: 'Milk', checked: false, sectionId: null }],
        sections: [],
      },
    ]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByText('Milk'));

    await fireEvent.press(screen.getByText('Milk'));

    await waitFor(() => {
      const style = screen.getByText('Milk').props.style;
      const flattened = Array.isArray(style)
        ? Object.assign({}, ...style)
        : style;
      expect(flattened.textDecorationLine).toBe('line-through');
    });
  });

  it("edits an item's text", async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [{ id: 'a', text: 'Milk', checked: false, sectionId: null }],
        sections: [],
      },
    ]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByText('Milk'));

    await fireEvent.press(screen.getByText('Edit'));
    await fireEvent.changeText(screen.getByDisplayValue('Milk'), 'Oat milk');
    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(screen.getByText('Oat milk')).toBeTruthy());
    expect((await repo.getAll())[0].items[0].text).toBe('Oat milk');
  });

  it('deletes an item', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [{ id: 'a', text: 'Milk', checked: false, sectionId: null }],
        sections: [],
      },
    ]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByText('Milk'));

    await fireEvent.press(screen.getByText('Delete'));

    await waitFor(() => expect(screen.queryByText('Milk')).toBeNull());
    expect((await repo.getAll())[0].items).toHaveLength(0);
  });

  it('shows "Clear checked" only when an item is checked, and clears on press', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [
          { id: 'a', text: 'Milk', checked: false, sectionId: null },
          { id: 'b', text: 'Eggs', checked: false, sectionId: null },
        ],
        sections: [],
      },
    ]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByText('Milk'));
    expect(screen.queryByText('Clear checked')).toBeNull();

    await fireEvent.press(screen.getByText('Milk'));
    await waitFor(() => expect(screen.getByText('Clear checked')).toBeTruthy());

    await fireEvent.press(screen.getByText('Clear checked'));

    await waitFor(() => expect(screen.queryByText('Milk')).toBeNull());
    expect(screen.getByText('Eggs')).toBeTruthy();
    expect(screen.queryByText('Clear checked')).toBeNull();
    expect((await repo.getAll())[0].items).toHaveLength(1);
  });

  // CheL-3: Reordering & sections.
  // Drag gestures are driven through a mocked react-native-reanimated-dnd
  // (__mocks__/react-native-reanimated-dnd.js) that exposes drag completion
  // as `fireEvent(getByTestId('sortable-item-<rowId>'), 'drop', { to })`.

  it('adds a named section and shows it as a header', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      { id: '1', title: 'Groceries', items: [], sections: [] },
    ]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByText('+ New section'));

    await fireEvent.press(screen.getByText('+ New section'));
    await fireEvent.changeText(
      screen.getByPlaceholderText('Section name'),
      'Produce',
    );
    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() =>
      expect(screen.getAllByText('Produce').length).toBeGreaterThan(0),
    );
    expect((await repo.getAll())[0].sections.map(s => s.name)).toEqual([
      'Produce',
    ]);
  });

  it('shows a section chip for each section when adding an item, and assigns the item to the picked chip', async () => {
    const repo = new AsyncStorageChecklistRepository();
    const produce = { id: 'produce', name: 'Produce' };
    await repo.saveAll([
      { id: '1', title: 'Groceries', items: [], sections: [produce] },
    ]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByTestId('section-chip-default'));
    expect(screen.getByTestId('section-chip-produce')).toBeTruthy();

    await fireEvent.changeText(
      screen.getByPlaceholderText('New item'),
      'Apple',
    );
    await fireEvent.press(screen.getByTestId('section-chip-produce'));
    await fireEvent.press(screen.getByText('Add'));

    await waitFor(() => expect(screen.getByText('Apple')).toBeTruthy());
    expect((await repo.getAll())[0].items[0].sectionId).toBe('produce');
  });

  it('adds an item without picking a section into the default section', async () => {
    const repo = new AsyncStorageChecklistRepository();
    const produce = { id: 'produce', name: 'Produce' };
    await repo.saveAll([
      { id: '1', title: 'Groceries', items: [], sections: [produce] },
    ]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByText('No section'));

    await fireEvent.changeText(screen.getByPlaceholderText('New item'), 'Milk');
    await fireEvent.press(screen.getByText('Add'));

    await waitFor(() => expect(screen.getByText('Milk')).toBeTruthy());
    expect((await repo.getAll())[0].items[0].sectionId).toBeNull();
  });

  it('does not show any section chips or default-section header when the checklist has no named sections', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [{ id: 'a', text: 'Milk', checked: false, sectionId: null }],
        sections: [],
      },
    ]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByText('Milk'));

    expect(screen.queryByText('No section')).toBeNull();
  });

  it('reorders items within the same section via drag', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [
          { id: 'a', text: 'A', checked: false, sectionId: null },
          { id: 'b', text: 'B', checked: false, sectionId: null },
          { id: 'c', text: 'C', checked: false, sectionId: null },
        ],
        sections: [],
      },
    ]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByText('A'));

    // Row 0 ('A') dropped at row 2 (after 'C'): new order is B, C, A.
    await fireEvent(screen.getByTestId('sortable-item-item:a'), 'drop', {
      to: 2,
    });

    await waitFor(async () => {
      const items = (await repo.getAll())[0].items;
      expect(items.map(i => i.text)).toEqual(['B', 'C', 'A']);
    });
  });

  it('moves an item to a different section via drag', async () => {
    const repo = new AsyncStorageChecklistRepository();
    const produce = { id: 'produce', name: 'Produce' };
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [{ id: 'milk', text: 'Milk', checked: false, sectionId: null }],
        sections: [produce],
      },
    ]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByText('Milk'));

    // Rows: [0] default header, [1] Milk, [2] Produce header.
    // Drop Milk (row 1) after the Produce header (row 2).
    await fireEvent(screen.getByTestId('sortable-item-item:milk'), 'drop', {
      to: 2,
    });

    await waitFor(async () => {
      const items = (await repo.getAll())[0].items;
      expect(items[0].sectionId).toBe('produce');
    });
  });

  it('reorders sections via drag, carrying their items with them', async () => {
    const repo = new AsyncStorageChecklistRepository();
    const produce = { id: 'produce', name: 'Produce' };
    const dairy = { id: 'dairy', name: 'Dairy' };
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [
          { id: 'apple', text: 'Apple', checked: false, sectionId: 'produce' },
          { id: 'milk', text: 'Milk', checked: false, sectionId: 'dairy' },
        ],
        sections: [produce, dairy],
      },
    ]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByText('Apple'));

    // Rows: [0] default header, [1] Produce header, [2] Apple, [3] Dairy header, [4] Milk.
    // Drag the Dairy header (row 3) above Produce (to row 1).
    await fireEvent(screen.getByTestId('sortable-item-section:dairy'), 'drop', {
      to: 1,
    });

    await waitFor(async () => {
      const persisted = (await repo.getAll())[0];
      expect(persisted.sections.map(s => s.id)).toEqual(['dairy', 'produce']);
    });
    expect((await repo.getAll())[0].items.map(i => i.id)).toEqual([
      'milk',
      'apple',
    ]);
  });

  it('deletes a section, with confirmation, and falls its items back to the default section', async () => {
    const repo = new AsyncStorageChecklistRepository();
    const produce = { id: 'produce', name: 'Produce' };
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [
          { id: 'apple', text: 'Apple', checked: false, sectionId: 'produce' },
        ],
        sections: [produce],
      },
    ]);
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) => {
        buttons?.find(b => b.text === 'Delete')?.onPress?.();
      });

    await renderDetailScreen('1');
    await waitFor(() =>
      expect(screen.getAllByText('Produce').length).toBeGreaterThan(0),
    );

    await fireEvent.press(screen.getByTestId('delete-section-produce'));

    await waitFor(() => expect(screen.queryByText('Produce')).toBeNull());
    expect(screen.getByText('Apple')).toBeTruthy();
    expect((await repo.getAll())[0].sections).toHaveLength(0);
    expect((await repo.getAll())[0].items[0].sectionId).toBeNull();

    alertSpy.mockRestore();
  });

  it('cancels section deletion when the confirm dialog is declined', async () => {
    const repo = new AsyncStorageChecklistRepository();
    const produce = { id: 'produce', name: 'Produce' };
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [
          { id: 'apple', text: 'Apple', checked: false, sectionId: 'produce' },
        ],
        sections: [produce],
      },
    ]);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await renderDetailScreen('1');
    await waitFor(() =>
      expect(screen.getAllByText('Produce').length).toBeGreaterThan(0),
    );

    await fireEvent.press(screen.getByTestId('delete-section-produce'));

    expect(screen.getAllByText('Produce').length).toBeGreaterThan(0);
    expect(screen.getByText('Apple')).toBeTruthy();
    expect((await repo.getAll())[0].sections).toHaveLength(1);

    alertSpy.mockRestore();
  });
});
