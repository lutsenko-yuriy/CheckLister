import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ItemRow } from './ItemRow';
import { Item } from '../../domain/models';

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'a',
    text: 'Milk',
    checked: false,
    sectionId: null,
    ...overrides,
  };
}

describe('ItemRow', () => {
  it('renders the item text unchecked by default', async () => {
    await render(
      <ItemRow
        item={item()}
        onToggle={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        dragHandle={<Text>Handle</Text>}
      />,
    );
    expect(screen.getByText('Milk')).toBeTruthy();
  });

  it('calls onToggle when the item text is pressed', async () => {
    const onToggle = jest.fn();
    await render(
      <ItemRow
        item={item()}
        onToggle={onToggle}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        dragHandle={<Text>Handle</Text>}
      />,
    );
    fireEvent.press(screen.getByText('Milk'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('renders the provided drag handle', async () => {
    await render(
      <ItemRow
        item={item()}
        onToggle={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        dragHandle={<Text>Handle</Text>}
      />,
    );
    expect(screen.getByText('Handle')).toBeTruthy();
  });

  it('edits the item text via Edit/Save', async () => {
    const onEdit = jest.fn();
    await render(
      <ItemRow
        item={item()}
        onToggle={jest.fn()}
        onEdit={onEdit}
        onDelete={jest.fn()}
        dragHandle={<Text>Handle</Text>}
      />,
    );
    await fireEvent.press(screen.getByText('Edit'));
    await fireEvent.changeText(screen.getByDisplayValue('Milk'), 'Oat milk');
    await fireEvent.press(screen.getByText('Save'));
    expect(onEdit).toHaveBeenCalledWith('Oat milk');
  });

  it('calls onDelete when Delete is pressed', async () => {
    const onDelete = jest.fn();
    await render(
      <ItemRow
        item={item()}
        onToggle={jest.fn()}
        onEdit={jest.fn()}
        onDelete={onDelete}
        dragHandle={<Text>Handle</Text>}
      />,
    );
    fireEvent.press(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalled();
  });
});
