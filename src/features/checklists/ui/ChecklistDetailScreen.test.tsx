import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
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
    await repo.saveAll([{ id: '1', title: 'Groceries', items: [] }]);

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
    await repo.saveAll([{ id: '1', title: 'Groceries', items: [] }]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByPlaceholderText('New item'));

    await fireEvent.changeText(
      screen.getByPlaceholderText('New item'),
      'Milk',
    );
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
        items: [{ id: 'a', text: 'Milk', checked: false }],
      },
    ]);

    await renderDetailScreen('1');
    await waitFor(() => screen.getByText('Milk'));

    await fireEvent.press(screen.getByText('Milk'));

    await waitFor(() => {
      const style = screen.getByText('Milk').props.style;
      const flattened = Array.isArray(style) ? Object.assign({}, ...style) : style;
      expect(flattened.textDecorationLine).toBe('line-through');
    });
  });

  it('edits an item\'s text', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [{ id: 'a', text: 'Milk', checked: false }],
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
        items: [{ id: 'a', text: 'Milk', checked: false }],
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
          { id: 'a', text: 'Milk', checked: false },
          { id: 'b', text: 'Eggs', checked: false },
        ],
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
});
