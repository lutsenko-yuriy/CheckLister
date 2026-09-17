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
    await repo.saveAll([{ id: '1', title: 'Groceries', items: [], sections: [] }]);

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
    await repo.saveAll([{ id: '1', title: 'Groceries', items: [], sections: [] }]);

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

  // CheL-3: Reordering & sections — stubs below, filled in during implementation.
  // Drag gestures are driven through a mocked react-native-draggable-flatlist
  // (WU3 infra) that exposes onDragEnd({ from, to }) via a testID-addressable
  // trigger.

  it('adds a named section and shows it as a header', async () => {
    // TODO: Seed a checklist with no sections.
    // TODO: Render detail screen.
    // TODO: Trigger "add section" flow, enter name "Produce", save.
    // TODO: Verify a "Produce" header renders in the list.
  });

  it('shows a section chip for each section when adding an item, and assigns the item to the picked chip', async () => {
    // TODO: Seed a checklist with an existing named section "Produce".
    // TODO: Render detail screen.
    // TODO: Verify a "Produce" chip is visible above the add-item input (and a "No section" chip).
    // TODO: Type an item's text, select the "Produce" chip, press Add.
    // TODO: Verify the new item appears under the "Produce" header.
  });

  it('adds an item without picking a section into the default section', async () => {
    // TODO: Seed a checklist with an existing named section "Produce".
    // TODO: Render detail screen.
    // TODO: Type item text, leave "No section" selected (default), press Add.
    // TODO: Verify the item appears above the "Produce" header (default section, no header of its own).
  });

  it('does not show any section chips or default-section header when the checklist has no named sections', async () => {
    // TODO: Seed a checklist with only unsectioned items.
    // TODO: Render detail screen.
    // TODO: Verify no section chips are rendered and no header row appears — list looks like today's flat list.
  });

  it('reorders items within the same section via drag', async () => {
    // TODO: Seed a checklist with items A, B, C, all unsectioned.
    // TODO: Render detail screen.
    // TODO: Fire the mocked drag-end trigger moving row A to row C's position.
    // TODO: Verify the rendered order is now B, C, A.
    // TODO: Verify the persisted repository order matches.
  });

  it('moves an item to a different section via drag', async () => {
    // TODO: Seed a checklist with section "Produce" and an unsectioned item "Milk".
    // TODO: Render detail screen.
    // TODO: Fire the mocked drag-end trigger moving "Milk"'s row to a position under the "Produce" header.
    // TODO: Verify "Milk" now renders under "Produce".
    // TODO: Verify the persisted item's sectionId matches the "Produce" section.
  });

  it('reorders sections via drag, carrying their items with them', async () => {
    // TODO: Seed a checklist with sections "Produce" (item "Apple") and "Dairy" (item "Milk"), in that order.
    // TODO: Render detail screen.
    // TODO: Fire the mocked drag-end trigger moving the "Dairy" header above "Produce".
    // TODO: Verify rendered order is Dairy header -> Milk -> Produce header -> Apple.
    // TODO: Verify persisted sections order matches.
  });

  it('deletes a section, with confirmation, and falls its items back to the default section', async () => {
    // TODO: Seed a checklist with section "Produce" containing item "Apple".
    // TODO: Render detail screen.
    // TODO: Press the "Produce" header's delete action.
    // TODO: Confirm the deletion in the confirm dialog.
    // TODO: Verify the "Produce" header is gone and "Apple" still renders (now in the default section).
    // TODO: Verify persisted checklist has no "Produce" section and "Apple"'s sectionId is null.
  });

  it('cancels section deletion when the confirm dialog is declined', async () => {
    // TODO: Seed a checklist with section "Produce" containing item "Apple".
    // TODO: Press delete on "Produce", then decline/cancel the confirm dialog.
    // TODO: Verify "Produce" header and "Apple" are unchanged, and nothing was persisted differently.
  });
});
