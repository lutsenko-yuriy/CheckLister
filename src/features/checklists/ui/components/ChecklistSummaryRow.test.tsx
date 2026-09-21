import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ChecklistSummaryRow } from './ChecklistSummaryRow';
import { createChecklist, createItem } from '../../domain/models';

describe('ChecklistSummaryRow', () => {
  it('renders the checklist title without an item count when empty', async () => {
    const checklist = createChecklist('Groceries');

    await render(<ChecklistSummaryRow checklist={checklist} onPress={jest.fn()} />);

    expect(screen.getByText('Groceries')).toBeTruthy();
    expect(screen.queryByText(/item/)).toBeNull();
  });

  it('shows the plural item count', async () => {
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk'), createItem('Eggs')],
    };

    await render(<ChecklistSummaryRow checklist={checklist} onPress={jest.fn()} />);

    expect(screen.getByText('2 items')).toBeTruthy();
  });

  it('uses the singular form for a single item', async () => {
    const checklist = {
      ...createChecklist('Groceries'),
      items: [createItem('Milk')],
    };

    await render(<ChecklistSummaryRow checklist={checklist} onPress={jest.fn()} />);

    expect(screen.getByText('1 item')).toBeTruthy();
  });

  it('calls onPress when tapped', async () => {
    const checklist = createChecklist('Groceries');
    const onPress = jest.fn();

    await render(<ChecklistSummaryRow checklist={checklist} onPress={onPress} />);
    await fireEvent.press(screen.getByText('Groceries'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes an optional testID on the pressable row', async () => {
    const checklist = createChecklist('Groceries');

    await render(
      <ChecklistSummaryRow
        checklist={checklist}
        onPress={jest.fn()}
        testID="checklist-row-Groceries"
      />,
    );

    expect(screen.getByTestId('checklist-row-Groceries')).toBeTruthy();
  });
});
