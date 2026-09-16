import React from 'react';
import {Alert} from 'react-native';
import {render, fireEvent, waitFor, screen} from '@testing-library/react-native';
import {ChecklistsProvider} from '../useChecklists';
import {AsyncStorageChecklistRepository} from '../data/asyncStorageChecklistRepository';
import {HomeScreen} from './HomeScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function renderHomeScreen(navigate: jest.Mock = jest.fn()) {
  return render(
    <ChecklistsProvider>
      <HomeScreen
        navigation={{navigate} as any}
        route={{} as any}
      />
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
    await fireEvent.press(screen.getByText('Add'));

    await waitFor(() => expect(screen.getByText('Groceries')).toBeTruthy());
    expect(
      screen.getByPlaceholderText('New checklist title').props.value,
    ).toBe('');
  });

  it('shows the unchecked item count only once a checklist has items', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([
      {
        id: '1',
        title: 'Groceries',
        items: [
          {id: 'a', text: 'Milk', checked: true},
          {id: 'b', text: 'Eggs', checked: false},
        ],
      },
      {id: '2', title: 'Empty list', items: []},
    ]);

    await renderHomeScreen();

    await waitFor(() => expect(screen.getByText('1 of 2 left')).toBeTruthy());
    expect(screen.queryByText(/left/, {exact: false})).toBeTruthy();
    expect(screen.getByText('Empty list')).toBeTruthy();
  });

  it('navigates to the checklist detail screen when a row is pressed', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([{id: '1', title: 'Groceries', items: []}]);
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
    await repo.saveAll([{id: '1', title: 'Old title', items: []}]);

    await renderHomeScreen();
    await waitFor(() => screen.getByText('Old title'));

    await fireEvent.press(screen.getByText('Rename'));
    await fireEvent.changeText(screen.getByDisplayValue('Old title'), 'New title');
    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(screen.getByText('New title')).toBeTruthy());
    expect(await repo.getAll()).toEqual([
      {id: '1', title: 'New title', items: []},
    ]);
  });

  it('deletes a checklist after the user confirms', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([{id: '1', title: 'Groceries', items: []}]);
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      buttons?.find(button => button.text === 'Delete')?.onPress?.();
    });

    await renderHomeScreen();
    await waitFor(() => screen.getByText('Groceries'));
    await fireEvent.press(screen.getByText('Delete'));

    await waitFor(() =>
      expect(screen.getByText(/no checklists yet/i)).toBeTruthy(),
    );
    expect(await repo.getAll()).toEqual([]);
  });

  it('does not delete a checklist if the user cancels', async () => {
    const repo = new AsyncStorageChecklistRepository();
    await repo.saveAll([{id: '1', title: 'Groceries', items: []}]);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await renderHomeScreen();
    await waitFor(() => screen.getByText('Groceries'));
    await fireEvent.press(screen.getByText('Delete'));

    expect(screen.getByText('Groceries')).toBeTruthy();
    expect(await repo.getAll()).toHaveLength(1);
  });
});
