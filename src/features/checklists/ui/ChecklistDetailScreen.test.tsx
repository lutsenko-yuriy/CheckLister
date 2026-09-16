import React from 'react';
import { render, waitFor, screen } from '@testing-library/react-native';
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
});
