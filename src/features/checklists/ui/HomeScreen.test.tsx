import React from 'react';
import { Alert } from 'react-native';
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from '@testing-library/react-native';
import { ChecklistsProvider } from '../useChecklists';
import { AsyncStorageChecklistRepository } from '../data/asyncStorageChecklistRepository';
import { HomeScreen } from './HomeScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function renderHomeScreen(navigate: jest.Mock = jest.fn()) {
  return render(
    <ChecklistsProvider repository={new AsyncStorageChecklistRepository()}>
      <HomeScreen navigation={{ navigate } as any} route={{} as any} />
    </ChecklistsProvider>,
  );
}

describe('HomeScreen', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('shows an empty state when there are no checklists', async () => {
    await renderHomeScreen();
    await waitFor(() =>
      expect(screen.getByText(/no checklists yet/i)).toBeTruthy(),
    );
  });

  it('creates a checklist from the title input and clears it afterwards', async () => {
    await renderHomeScreen();
    await waitFor(() => screen.getByPlaceholderText('New checklist title'));

    await fireEvent.changeText(
      screen.getByPlaceholderText('New checklist title'),
      'Groceries',
    );
    await fireEvent.press(screen.getByLabelText('Add'));

    await waitFor(() => expect(screen.getByText('Groceries')).toBeTruthy());
    expect(screen.getByPlaceholderText('New checklist title').props.value).toBe(
      '',
    );
  });

  it('shows the item count only once a checklist has items', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [
          { id: 'a', text: 'Milk' },
          { id: 'b', text: 'Eggs' },
        ],
      },
      { id: '2', title: 'Empty list', items: [] },
    ]);

    await renderHomeScreen();

    await waitFor(() => expect(screen.getByText('2 items')).toBeTruthy());
    expect(screen.getByText('Empty list')).toBeTruthy();
  });

  it('uses the singular form for a single-item checklist', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [{ id: 'a', text: 'Milk' }],
      },
    ]);

    await renderHomeScreen();

    await waitFor(() => expect(screen.getByText('1 item')).toBeTruthy());
  });

  it('navigates to the checklist detail screen when a row is pressed', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([{ id: '1', title: 'Groceries', items: [] }]);
    const navigate = jest.fn();

    await renderHomeScreen(navigate);
    await waitFor(() => screen.getByText('Groceries'));
    await fireEvent.press(screen.getByText('Groceries'));

    expect(navigate).toHaveBeenCalledWith('ChecklistDetail', {
      checklistId: '1',
    });
  });

  it('renames a checklist', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([{ id: '1', title: 'Old title', items: [] }]);

    await renderHomeScreen();
    await waitFor(() => screen.getByText('Old title'));

    await fireEvent.press(screen.getByLabelText('Rename'));
    await fireEvent.changeText(
      screen.getByDisplayValue('Old title'),
      'New title',
    );
    await fireEvent.press(screen.getByLabelText('Save'));

    await waitFor(() => expect(screen.getByText('New title')).toBeTruthy());
    expect(await repo.getAll()).toEqual([
      { id: '1', title: 'New title', items: [] },
    ]);
  });

  it('deletes a checklist after the user confirms', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([{ id: '1', title: 'Groceries', items: [] }]);
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      buttons?.find(button => button.text === 'Delete')?.onPress?.();
    });

    await renderHomeScreen();
    await waitFor(() => screen.getByText('Groceries'));
    await fireEvent.press(screen.getByLabelText('Delete'));

    await waitFor(() =>
      expect(screen.getByText(/no checklists yet/i)).toBeTruthy(),
    );
    expect(await repo.getAll()).toEqual([]);
  });

  it('targets only the named smoke fixture for deletion', async () => {
    const repo = new AsyncStorageChecklistRepository();
    const existing = { id: '1', title: 'Groceries', items: [] };
    await repo.saveAll([
      existing,
      { id: '2', title: 'Smoke unique-fixture', items: [] },
    ]);
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      buttons?.find(button => button.text === 'Delete')?.onPress?.();
    });

    await renderHomeScreen();
    await waitFor(() => screen.getByText('Smoke unique-fixture'));
    await fireEvent.press(
      screen.getByTestId('delete-checklist-Smoke unique-fixture'),
    );

    await waitFor(() =>
      expect(screen.queryByText('Smoke unique-fixture')).toBeNull(),
    );
    expect(screen.getByText('Groceries')).toBeTruthy();
    expect(await repo.getAll()).toEqual([existing]);
  });

  it('does not delete a checklist if the user cancels', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([{ id: '1', title: 'Groceries', items: [] }]);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await renderHomeScreen();
    await waitFor(() => screen.getByText('Groceries'));
    await fireEvent.press(screen.getByLabelText('Delete'));

    expect(screen.getByText('Groceries')).toBeTruthy();
    expect(await repo.getAll()).toHaveLength(1);
  });
});
